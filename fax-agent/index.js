/**
 * FAX Watcher Agent
 * 
 * Scans a local folder for new fax files and uploads them to the OPS system.
 * Designed to run via Windows Task Scheduler every 5 minutes.
 * 
 * Usage:
 *   node index.js           — single scan then exit
 *   node index.js --watch   — continuous mode (scan every N minutes)
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const CONFIG_PATH = path.join(__dirname, 'config.json')
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

const WATCH_FOLDER = config.watchFolder
const API_URL = config.apiUrl.replace(/([^:])\/\//g, '$1/')
// SECURITY: API Key should be set via environment variable, not in config.json
const API_KEY = process.env.FAX_API_KEY || config.apiKey || ''
const EXTENSIONS = config.extensions || ['.pdf', '.tif', '.tiff', '.jpg', '.jpeg', '.png']
const PROCESSED_FILE = path.resolve(__dirname, config.processedFile || './processed.json')
const WATCH_INTERVAL_MS = (config.checkIntervalMinutes || 5) * 60 * 1000

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

function getNewFiles(processed) {
  if (!fs.existsSync(WATCH_FOLDER)) {
    log(`ERROR: Watch folder not found: ${WATCH_FOLDER}`)
    return []
  }

  const files = fs.readdirSync(WATCH_FOLDER)
  const newFiles = []

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!EXTENSIONS.includes(ext)) continue

    const fullPath = path.join(WATCH_FOLDER, file)
    const stat = fs.statSync(fullPath)
    if (!stat.isFile()) continue

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
    // File part
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
    )
    parts.push(fileData)
    parts.push('\r\n')

    // received_at part
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

async function scan() {
  log('Scanning for new fax files...')
  const processed = loadProcessed()
  const newFiles = getNewFiles(processed)

  if (newFiles.length === 0) {
    log('No new files found.')
    return
  }

  log(`Found ${newFiles.length} new file(s)`)

  for (const { file, fullPath, key, stat } of newFiles) {
    try {
      log(`Uploading: ${file} (${(stat.size / 1024).toFixed(1)} KB)`)
      const result = await uploadFile(fullPath, file)
      processed[key] = { uploadedAt: new Date().toISOString(), faxId: result.fax?.id }
      saveProcessed(processed)
      log(`  ✓ Uploaded: ${file} → fax_id: ${result.fax?.id || 'unknown'}`)
    } catch (e) {
      log(`  ✗ Failed: ${file} — ${e.message}`)
    }
  }

  log('Scan complete.')
}

async function main() {
  log('=== FAX Watcher Agent ===')
  log(`Watch folder: ${WATCH_FOLDER}`)
  log(`API URL: ${API_URL}`)
  log(`Extensions: ${EXTENSIONS.join(', ')}`)

  if (!fs.existsSync(WATCH_FOLDER)) {
    log(`ERROR: Folder "${WATCH_FOLDER}" does not exist. Please update config.json.`)
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

main().catch(e => {
  log(`FATAL: ${e.message}`)
  process.exit(1)
})
