/**
 * FAX Watcher Agent v1.1
 *
 * Scans a local folder for new fax files and uploads them to the OPS system.
 * Designed to run via Windows Task Scheduler every 5 minutes.
 *
 * Sends a heartbeat to the OPS server on every scan so the OPS UI can
 * monitor connection status in real time.
 *
 * Usage:
 *   node index.js           — single scan then exit
 *   node index.js --watch   — continuous mode (scan every N minutes)
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const os = require('os')

const AGENT_VERSION = '1.1.0'

const CONFIG_PATH = path.join(__dirname, 'config.json')
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

const WATCH_FOLDER = config.watchFolder
const API_URL = (config.apiUrl || '').replace(/([^:])\/\//g, '$1/')
const API_KEY = process.env.FAX_API_KEY || config.apiKey || ''
const EXTENSIONS = config.extensions || ['.pdf', '.tif', '.tiff', '.jpg', '.jpeg', '.png']
const PROCESSED_FILE = path.resolve(__dirname, config.processedFile || './processed.json')
const WATCH_INTERVAL_MS = (config.checkIntervalMinutes || 5) * 60 * 1000

// Derive heartbeat URL from upload URL
const HEARTBEAT_URL = API_URL.replace('/api/fax/upload', '/api/fax/heartbeat')

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)
  console.log(`[${ts}] ${msg}`)
}

function loadProcessed() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'))
    }
  } catch (e) {
    log(`Warning: Could not read processed file: ${e.message}`)
  }
  return {}
}

function saveProcessed(processed) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processed, null, 2))
}

function listMatchingFilesInFolder() {
  if (!fs.existsSync(WATCH_FOLDER)) return null
  try {
    const all = fs.readdirSync(WATCH_FOLDER)
    return all.filter(f => {
      const ext = path.extname(f).toLowerCase()
      if (!EXTENSIONS.includes(ext)) return false
      try {
        const stat = fs.statSync(path.join(WATCH_FOLDER, f))
        return stat.isFile()
      } catch { return false }
    })
  } catch { return null }
}

function getNewFiles(processed) {
  const matching = listMatchingFilesInFolder()
  if (matching === null) {
    log(`ERROR: Watch folder not found: ${WATCH_FOLDER}`)
    return []
  }
  const newFiles = []
  for (const file of matching) {
    const fullPath = path.join(WATCH_FOLDER, file)
    const stat = fs.statSync(fullPath)
    const key = `${file}|${stat.size}|${stat.mtimeMs}`
    if (processed[key]) continue
    newFiles.push({ file, fullPath, key, stat })
  }
  return newFiles
}

function uploadFile(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath)
    const boundary = '----FaxAgent' + Date.now().toString(36)

    const ext = path.extname(fileName).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.pdf') contentType = 'application/pdf'
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (['.tif', '.tiff'].includes(ext)) contentType = 'image/tiff'
    else if (ext === '.bmp') contentType = 'image/bmp'

    const parts = []
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
    )
    parts.push(fileData)
    parts.push('\r\n')

    const stat = fs.statSync(filePath)
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="received_at"\r\n\r\n` +
      stat.mtime.toISOString() + '\r\n'
    )
    parts.push(`--${boundary}--\r\n`)

    const bodyParts = []
    for (const part of parts) {
      bodyParts.push(typeof part === 'string' ? Buffer.from(part) : part)
    }
    const body = Buffer.concat(bodyParts)

    const url = new URL(API_URL)
    const isHttps = url.protocol === 'https:'
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      },
    }

    const client = isHttps ? https : http
    const req = client.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.success) {
            resolve(json)
          } else {
            reject(new Error(json.error || `HTTP ${res.statusCode}`))
          }
        } catch {
          reject(new Error(`Invalid response: ${data.slice(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function sendHeartbeat(payload) {
  return new Promise((resolve) => {
    if (!HEARTBEAT_URL) return resolve(false)
    try {
      const url = new URL(HEARTBEAT_URL)
      const isHttps = url.protocol === 'https:'
      const body = Buffer.from(JSON.stringify(payload))
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
        },
        timeout: 10000,
      }
      const client = isHttps ? https : http
      const req = client.request(options, (res) => {
        res.on('data', () => {})
        res.on('end', () => resolve(res.statusCode === 200))
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
      req.write(body)
      req.end()
    } catch { resolve(false) }
  })
}

async function scan() {
  log('Scanning for new fax files...')
  const processed = loadProcessed()
  const matching = listMatchingFilesInFolder()
  const filesInFolder = matching ? matching.length : 0
  const newFiles = getNewFiles(processed)

  let scanError = null
  if (matching === null) {
    scanError = `Watch folder not accessible: ${WATCH_FOLDER}`
  }

  let uploadedCount = 0
  let lastUploadedFile = null
  let lastUploadError = null

  if (newFiles.length === 0) {
    log(`No new files found. (Total ${filesInFolder} matching files in folder)`)
  } else {
    log(`Found ${newFiles.length} new file(s)`)
    for (const { file, fullPath, key, stat } of newFiles) {
      try {
        log(`Uploading: ${file} (${(stat.size / 1024).toFixed(1)} KB)`)
        const result = await uploadFile(fullPath, file)
        processed[key] = { uploadedAt: new Date().toISOString(), faxId: result.fax?.id }
        saveProcessed(processed)
        uploadedCount++
        lastUploadedFile = file
        log(`  V Uploaded: ${file} -> fax_id: ${result.fax?.id || 'unknown'}`)
      } catch (e) {
        lastUploadError = `${file}: ${e.message}`
        log(`  X Failed: ${file} - ${e.message}`)
      }
    }
  }

  // Send heartbeat (always, even on idle scans)
  const heartbeat = {
    watch_folder: WATCH_FOLDER,
    files_in_folder: filesInFolder,
    files_processed_delta: uploadedCount,
    agent_version: AGENT_VERSION,
    hostname: os.hostname(),
  }
  if (lastUploadedFile) heartbeat.last_uploaded_file = lastUploadedFile
  if (scanError || lastUploadError) heartbeat.last_error = scanError || lastUploadError
  else heartbeat.clear_error = true

  const ok = await sendHeartbeat(heartbeat)
  log(ok ? 'Heartbeat OK' : 'Heartbeat FAILED (check API_KEY / network / URL)')

  log('Scan complete.')
}

async function main() {
  log('=== FAX Watcher Agent ===')
  log(`Version: ${AGENT_VERSION}`)
  log(`Hostname: ${os.hostname()}`)
  log(`Watch folder: ${WATCH_FOLDER}`)
  log(`API URL: ${API_URL}`)
  log(`Heartbeat URL: ${HEARTBEAT_URL}`)
  log(`Extensions: ${EXTENSIONS.join(', ')}`)
  log(`API_KEY: ${API_KEY ? `set (${API_KEY.length} chars)` : 'MISSING'}`)

  if (!API_KEY) {
    log('ERROR: FAX_API_KEY not set. Run: setx FAX_API_KEY "your-key" /M')
  }

  if (!fs.existsSync(WATCH_FOLDER)) {
    log(`ERROR: Folder "${WATCH_FOLDER}" does not exist. Please update config.json.`)
    // Send heartbeat with error so OPS knows
    await sendHeartbeat({
      watch_folder: WATCH_FOLDER,
      files_in_folder: 0,
      last_error: `Watch folder does not exist: ${WATCH_FOLDER}`,
      agent_version: AGENT_VERSION,
      hostname: os.hostname(),
    })
    process.exit(1)
  }

  const isWatchMode = process.argv.includes('--watch')

  if (isWatchMode) {
    log(`Watch mode: scanning every ${config.checkIntervalMinutes || 5} minutes`)
    await scan()
    setInterval(scan, WATCH_INTERVAL_MS)
  } else {
    await scan()
    process.exit(0)
  }
}

main().catch(async (e) => {
  log(`FATAL: ${e.message}`)
  await sendHeartbeat({
    watch_folder: WATCH_FOLDER,
    files_in_folder: 0,
    last_error: `FATAL: ${e.message}`,
    agent_version: AGENT_VERSION,
    hostname: os.hostname(),
  })
  process.exit(1)
})
