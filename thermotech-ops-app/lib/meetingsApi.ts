'use client'

import { createClient } from '@supabase/supabase-js'
import { notify } from './notifications'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export type ParticipantRole = 'attendee' | 'related' | 'helper'

export interface Meeting {
  id: string
  title: string
  summary: string | null
  location: string | null
  meeting_date: string         // 'YYYY-MM-DD'
  start_time: string | null    // 'HH:mm:ss'
  end_time: string | null
  assignment_id: number | null
  record_reminder_sent: boolean
  record_uploaded: boolean
  meeting_record_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  user_id: string
  role: ParticipantRole
  helper_task: string | null
  notified_at: string | null
  acknowledged_at: string | null
  created_at: string
}

export interface CreateMeetingInput {
  title: string
  summary?: string
  location?: string
  meeting_date: string
  start_time?: string
  end_time?: string
  assignment_id?: number
  attendees: string[]   // user_ids
  related: string[]     // user_ids
  helpers: { user_id: string; helper_task?: string }[]
  created_by?: string
  /** Send LINE push in addition to in-app */
  use_line?: boolean
}

export async function createMeeting(input: CreateMeetingInput): Promise<{ meeting: Meeting; participants: MeetingParticipant[] }> {
  const { data: meeting, error } = await sb
    .from('scheduled_meetings')
    .insert({
      title: input.title,
      summary: input.summary || null,
      location: input.location || null,
      meeting_date: input.meeting_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      assignment_id: input.assignment_id || null,
      created_by: input.created_by || null,
    })
    .select()
    .single()
  if (error) throw error

  const participantRows: Array<{
    meeting_id: string
    user_id: string
    role: ParticipantRole
    helper_task?: string | null
  }> = []
  for (const uid of input.attendees) {
    participantRows.push({ meeting_id: meeting.id, user_id: uid, role: 'attendee' })
  }
  for (const uid of input.related) {
    participantRows.push({ meeting_id: meeting.id, user_id: uid, role: 'related' })
  }
  for (const h of input.helpers) {
    participantRows.push({ meeting_id: meeting.id, user_id: h.user_id, role: 'helper', helper_task: h.helper_task || null })
  }

  let participants: MeetingParticipant[] = []
  if (participantRows.length > 0) {
    const { data: pdata, error: perr } = await sb
      .from('meeting_participants')
      .insert(participantRows)
      .select()
    if (perr) throw perr
    participants = pdata as MeetingParticipant[]
  }

  // Send notifications
  await sendMeetingNotifications(meeting as Meeting, participants, input.use_line || false)

  return { meeting: meeting as Meeting, participants }
}

async function sendMeetingNotifications(meeting: Meeting, participants: MeetingParticipant[], useLine: boolean) {
  const channels = useLine ? (['in_app', 'line'] as const) : (['in_app'] as const)
  const dateStr = meeting.meeting_date
  const timeStr = meeting.start_time
    ? meeting.end_time ? ` ${meeting.start_time.slice(0, 5)}–${meeting.end_time.slice(0, 5)}` : ` ${meeting.start_time.slice(0, 5)}`
    : ''
  const locStr = meeting.location ? `\n地點: ${meeting.location}` : ''

  const attendeeIds = participants.filter(p => p.role === 'attendee').map(p => p.user_id)
  const relatedIds = participants.filter(p => p.role === 'related').map(p => p.user_id)
  const helpers = participants.filter(p => p.role === 'helper')

  // Attendees
  if (attendeeIds.length > 0) {
    await notify({
      user_ids: attendeeIds,
      type: 'meeting',
      title: `📅 會議邀請: ${meeting.title}`,
      body: `${dateStr}${timeStr}${locStr}\n${meeting.summary || ''}`,
      link: `/home?tab=meeting&id=${meeting.id}`,
      channels: [...channels],
      metadata: { meeting_id: meeting.id, role: 'attendee' },
    })
  }

  // Related (informational only)
  if (relatedIds.length > 0) {
    await notify({
      user_ids: relatedIds,
      type: 'meeting',
      title: `📢 會議通知（相關人員）: ${meeting.title}`,
      body: `這場會議與您相關，但無需出席。\n${dateStr}${timeStr}${locStr}\n${meeting.summary || ''}`,
      link: `/home?tab=meeting&id=${meeting.id}`,
      channels: [...channels],
      metadata: { meeting_id: meeting.id, role: 'related' },
    })
  }

  // Helpers — one notification per helper because each has different task
  for (const h of helpers) {
    await notify({
      user_ids: [h.user_id],
      type: 'meeting_helper',
      title: `🛠 協助準備: ${meeting.title}`,
      body: `${dateStr}${timeStr}${locStr}\n\n您負責準備：\n${h.helper_task || '（請與會議發起人確認細節）'}`,
      link: `/home?tab=meeting&id=${meeting.id}`,
      channels: [...channels],
      metadata: { meeting_id: meeting.id, role: 'helper', helper_task: h.helper_task },
    })
  }
}

export async function getMeetingById(id: string): Promise<{ meeting: Meeting; participants: MeetingParticipant[] }> {
  const { data: meeting, error } = await sb.from('scheduled_meetings').select('*').eq('id', id).single()
  if (error) throw error
  const { data: participants } = await sb.from('meeting_participants').select('*').eq('meeting_id', id)
  return { meeting: meeting as Meeting, participants: (participants || []) as MeetingParticipant[] }
}

export async function getMeetingsForMonth(year: number, month: number): Promise<Meeting[]> {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const { data, error } = await sb
    .from('scheduled_meetings')
    .select('*')
    .gte('meeting_date', start)
    .lte('meeting_date', end)
    .order('meeting_date', { ascending: true })
  if (error) throw error
  return (data || []) as Meeting[]
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await sb.from('scheduled_meetings').delete().eq('id', id)
  if (error) throw error
}
