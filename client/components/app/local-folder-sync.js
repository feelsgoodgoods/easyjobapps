const PROFILE_FORMAT = 'easy-job-apps-profile'
const PROFILE_SCHEMA_VERSION = 1
const APPLY_SETTING_FIELDS = [
  'ignoreCompanyList', 'ignoreTitleList', 'messageToRecruiter',
  'formFillingInstructions', 'messageRecruiter', 'continuousMode',
]
const CURRENT_APPLICATION_FIELDS = [
  'companyName', 'company_name', 'jobTitle', 'job_title', 'link', 'text',
  'resume', 'resumeText', 'resume64', 'coverletter', 'coverletterText', 'coverletter64',
]

class ExternalFileChangedError extends Error {
  constructor() {
    super('A local Easy Job Apps file changed outside Easy Job Apps. Pull or reconnect before saving.')
    this.name = 'ExternalFileChangedError'
  }
}

function localDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function safeFilenamePart(value, fallback) {
  return String(value || fallback)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || fallback
}

function profileFilename(username, date = new Date()) {
  return `${localDate(date)}_${safeFilenamePart(username, 'guest')}_easy-job-apps-profile.json`
}

function pdfFilename(postData, type, date = new Date()) {
  const company = safeFilenamePart(postData?.companyName || postData?.company_name, 'company')
  const title = safeFilenamePart(postData?.jobTitle || postData?.job_title, 'job')
  const id = safeFilenamePart(postData?.id || postData?.post_id, '')
  const suffix = [company, title, id, safeFilenamePart(type, 'document')].filter(Boolean).join('_')
  return `${localDate(date)}_${suffix}.pdf`
}

function recordText(records, fallback) {
  const value = Array.isArray(records) ? records[0]?.text : records
  return value === undefined || value === null ? fallback : value
}

function recordObject(records) {
  let value = recordText(records, {})
  try {
    if (typeof value === 'string') value = JSON.parse(value)
  } catch {
    return {}
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function portableTemplates(records = []) {
  return records.map((record) => {
    let text = record?.text
    try {
      text = typeof text === 'string' ? JSON.parse(text) : { ...text }
      if (text && typeof text === 'object') delete text.id
    } catch {}
    return { title: record?.title || text?.title || 'Untitled', text }
  })
}

function portableApplication(postData = {}) {
  return Object.fromEntries(CURRENT_APPLICATION_FIELDS
    .filter((key) => postData?.[key] !== undefined && postData[key] !== null)
    .map((key) => [key, postData[key]]))
}

function portableSettings(records) {
  const settings = recordObject(records)
  return Object.fromEntries(APPLY_SETTING_FIELDS
    .filter((key) => settings[key] !== undefined)
    .map((key) => [key, settings[key]]))
}

function validPdfDataUrl(value) {
  if (typeof value !== 'string' || value.length > 20000000) return false
  const match = value.match(/^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/i)
  if (!match) return false
  try {
    return atob(match[1]).startsWith('%PDF-')
  } catch {
    return false
  }
}

function buildPortableProfile(userData = {}, postData = {}, options = {}) {
  const now = options.now || new Date()
  return {
    format: PROFILE_FORMAT,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    revision: (options.revision || 0) + 1,
    createdAt: options.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    updatedBy: 'easy-job-apps',
    profile: {
      username: userData.username || 'guest',
      applySettings: portableSettings(userData.applySettings),
      bio: recordText(userData.bio, ''),
      resumes: portableTemplates(userData.resumes),
      coverletters: portableTemplates(userData.coverletters),
    },
    currentApplication: portableApplication(postData),
  }
}

function validatePortableProfile(profile) {
  if (!profile || profile.format !== PROFILE_FORMAT || !profile.profile || !profile.currentApplication) {
    throw new Error('This is not an Easy Job Apps profile.')
  }
  if (typeof profile.profile !== 'object' || Array.isArray(profile.profile)) throw new Error('Profile data must be an object.')
  if (typeof profile.currentApplication !== 'object' || Array.isArray(profile.currentApplication)) {
    throw new Error('Profile currentApplication must be an object.')
  }
  if (profile.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new Error(`Unsupported Easy Job Apps profile schema version: ${profile.schemaVersion}`)
  }
  const topFields = new Set(['format', 'schemaVersion', 'revision', 'createdAt', 'updatedAt', 'updatedBy', 'profile', 'currentApplication'])
  const profileFields = new Set(['username', 'applySettings', 'bio', 'resumes', 'coverletters'])
  const unknownTopField = Object.keys(profile).find((key) => !topFields.has(key))
  const unknownProfileField = Object.keys(profile.profile).find((key) => !profileFields.has(key))
  const unknownApplySetting = Object.keys(profile.profile.applySettings || {}).find((key) => !APPLY_SETTING_FIELDS.includes(key))
  const unknownApplicationField = Object.keys(profile.currentApplication).find((key) => !CURRENT_APPLICATION_FIELDS.includes(key))
  if (unknownTopField) throw new Error(`Unknown profile field: ${unknownTopField}`)
  if (unknownProfileField) throw new Error(`Unknown portable profile field: ${unknownProfileField}`)
  if (unknownApplySetting) throw new Error(`Unknown apply setting: ${unknownApplySetting}`)
  if (unknownApplicationField) throw new Error(`Unknown current application field: ${unknownApplicationField}`)
  if (!Number.isInteger(profile.revision) || profile.revision < 1) throw new Error('Profile revision must be a positive integer.')
  if (!Number.isFinite(Date.parse(profile.createdAt)) || !Number.isFinite(Date.parse(profile.updatedAt))) {
    throw new Error('Profile timestamps must be valid dates.')
  }
  if (typeof profile.updatedBy !== 'string' || !profile.updatedBy) throw new Error('Profile updatedBy must be text.')
  if (typeof profile.profile.username !== 'string') throw new Error('Profile username must be text.')
  if (!profile.profile.applySettings || typeof profile.profile.applySettings !== 'object' || Array.isArray(profile.profile.applySettings)) {
    throw new Error('Profile applySettings must be an object.')
  }
  for (const [key, value] of Object.entries(profile.profile.applySettings)) {
    const valid = ['messageRecruiter', 'continuousMode'].includes(key)
      ? typeof value === 'boolean'
      : typeof value === 'string'
    if (!valid) throw new Error(`Profile apply setting has an invalid value: ${key}`)
  }
  if (typeof profile.profile.bio !== 'string') throw new Error('Profile bio must be text.')
  for (const type of ['resumes', 'coverletters']) {
    if (!Array.isArray(profile.profile[type])) throw new Error(`Profile ${type} must be an array.`)
    if (profile.profile[type].some((template) => {
      const text = template?.text
      return typeof template?.title !== 'string'
        || (typeof text !== 'string' && (!text || typeof text !== 'object' || Array.isArray(text)))
        || Object.keys(template).some((key) => !['title', 'text'].includes(key))
    })) {
      throw new Error(`Profile ${type} contains an invalid template.`)
    }
    const titles = profile.profile[type].map((template) => template.title)
    if (new Set(titles).size !== titles.length) throw new Error(`Profile ${type} contains a duplicate template title.`)
  }
  for (const [key, value] of Object.entries(profile.currentApplication)) {
    if (typeof value !== 'string' || (['resume64', 'coverletter64'].includes(key) && !validPdfDataUrl(value))) {
      throw new Error(`Profile contains an invalid current application value: ${key}`)
    }
  }
  return profile
}

async function sha256Buffer(value) {
  const digest = await crypto.subtle.digest('SHA-256', value)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(value) {
  return sha256Buffer(new TextEncoder().encode(value))
}

async function readFileHash(directory, name) {
  try {
    const handle = await directory.getFileHandle(name)
    return sha256Buffer(await (await handle.getFile()).arrayBuffer())
  } catch (error) {
    if (error?.name === 'NotFoundError') return null
    throw error
  }
}

async function findProfileName(directory, preferred, username) {
  if (preferred) {
    try {
      await directory.getFileHandle(preferred)
      return preferred
    } catch (error) {
      if (error?.name !== 'NotFoundError') throw error
    }
  }
  const names = []
  const suffix = username
    ? `_${safeFilenamePart(username, 'guest')}_easy-job-apps-profile.json`
    : '_easy-job-apps-profile.json'
  for await (const entry of directory.values()) {
    if (entry.kind === 'file' && entry.name.endsWith(suffix)) names.push(entry.name)
  }
  return names.sort().at(-1) || null
}

async function readFileText(directory, name) {
  try {
    const handle = await directory.getFileHandle(name)
    const file = await handle.getFile()
    if (file.size > 45000000) throw new Error('The Easy Job Apps profile is too large.')
    const contents = await file.text()
    if (contents.length > 45000000) throw new Error('The Easy Job Apps profile is too large.')
    return contents
  } catch (error) {
    if (error?.name === 'NotFoundError') return null
    throw error
  }
}

async function writeFile(directory, name, contents) {
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  try {
    await writable.write(contents)
    await writable.close()
  } catch (error) {
    try { await writable.abort?.() } catch {}
    throw error
  }
}

async function writeProfileSafely(directory, name, profile, expectedHash = null) {
  validatePortableProfile(profile)
  const current = await readFileText(directory, name)
  if ((current === null && expectedHash) || (current !== null && (!expectedHash || await sha256(current) !== expectedHash))) {
    throw new ExternalFileChangedError()
  }
  const contents = JSON.stringify(profile, null, 2)
  await writeFile(directory, name, contents)
  const saved = await readFileText(directory, name)
  if (saved !== contents) throw new ExternalFileChangedError()
  return { contents, hash: await sha256(contents) }
}

function createFolderObserver(directory, Observer = globalThis.FileSystemObserver, log = console.log) {
  if (!Observer) {
    const stop = () => {}
    stop.ready = Promise.resolve()
    return stop
  }
  let stopped = false
  const observer = new Observer((records) => {
    if (!stopped) log('Easy Job Apps FileSystemObserver event:', records)
  })
  const stop = () => {
    if (stopped) return
    stopped = true
    observer.disconnect()
  }
  stop.ready = Promise.resolve().then(() => observer.observe(directory, { recursive: false })).catch((error) => {
    stop()
    throw error
  })
  return stop
}

async function saveTemplates(type, templates, current, route) {
  const imported = []
  for (const template of templates || []) {
    const text = typeof template.text === 'object' ? { ...template.text, id: 'new' } : template.text
    const existing = (current || []).find((record) => record.title === template.title)
    let record
    if (existing?.id) {
      const storedText = typeof text === 'object' ? JSON.stringify({ ...text, id: existing.id }) : text
      record = { ...existing, title: template.title, text: storedText }
      await route({ label: `${type}templates`, userinfoid: existing.id, title: record.title, text: record.text }, '/userinfo_update')
    } else {
      record = await route({
        label: `${type}templates`,
        title: template.title,
        text: typeof text === 'string' ? text : JSON.stringify(text),
      }, '/userinfo_upload')
      if (!record?.id) throw new Error(`Unable to import ${type} template: ${template.title}`)
      if (text && typeof text === 'object') {
        record = { ...record, text: JSON.stringify({ ...text, id: record.id }) }
        await route({ label: `${type}templates`, userinfoid: record.id, text: record.text }, '/userinfo_update')
      }
    }
    imported.push(record)
  }
  const importedTitles = new Set(imported.map((record) => record.title))
  for (const record of current || []) {
    if (!importedTitles.has(record.title)) await route({ userinfoid: record.id }, '/userinfo_remove')
  }
  return imported
}

async function applyPortableProfile(profile, userData, { route, setUserData, setPostData }) {
  validatePortableProfile(profile)
  if (!await route({ applysettings: profile.profile.applySettings }, '/userinfo_update_single')) {
    throw new Error('Unable to import apply settings.')
  }
  let applySettings = await route(false, '/userinfo_view/applysettings')
  if (!Array.isArray(applySettings)) applySettings = [{ text: profile.profile.applySettings }]
  if (!await route({ bio: profile.profile.bio }, '/userinfo_update_single')) throw new Error('Unable to import bio.')
  let bio = await route(false, '/userinfo_view/bio')
  if (!Array.isArray(bio)) bio = [{ text: profile.profile.bio }]
  const importedResumes = await saveTemplates('resume', profile.profile.resumes, userData.resumes, route)
  const importedCoverletters = await saveTemplates('coverletter', profile.profile.coverletters, userData.coverletters, route)
  let resumes = await route(false, '/userinfo_view/resumetemplates')
  let coverletters = await route(false, '/userinfo_view/coverlettertemplates')
  if (!Array.isArray(resumes)) resumes = importedResumes
  if (!Array.isArray(coverletters)) coverletters = importedCoverletters
  const canonical = (records) => portableTemplates(records).sort((a, b) => a.title.localeCompare(b.title))
  if (JSON.stringify(canonical(resumes)) !== JSON.stringify([...profile.profile.resumes].sort((a, b) => a.title.localeCompare(b.title)))) {
    throw new Error('Imported resume templates did not persist correctly.')
  }
  if (JSON.stringify(canonical(coverletters)) !== JSON.stringify([...profile.profile.coverletters].sort((a, b) => a.title.localeCompare(b.title)))) {
    throw new Error('Imported cover letter templates did not persist correctly.')
  }
  const updatedUser = { ...userData, applySettings, bio, resumes, coverletters }
  setUserData(updatedUser)
  setPostData(profile.currentApplication)
  return updatedUser
}

async function writePdfAssets(directory, postData, previousHashes = {}, date = new Date()) {
  const hashes = { ...previousHashes }
  for (const type of ['resume', 'coverletter']) {
    const data = postData?.[`${type}64`]
    if (!data) continue
    const datedName = pdfFilename(postData, type, date)
    const assetKey = await sha256(datedName.slice(11))
    const sourceHash = await sha256(data)
    const previous = hashes[assetKey]
    const name = previous?.name || datedName
    const diskHash = await readFileHash(directory, name)
    if ((previous && diskHash !== previous.fileHash) || (!previous && diskHash !== null)) {
      throw new ExternalFileChangedError()
    }
    if (previous?.sourceHash === sourceHash) continue
    const blob = dataUrlToBlob(data)
    await writeFile(directory, name, blob)
    hashes[assetKey] = { name, sourceHash, fileHash: await sha256Buffer(await blob.arrayBuffer()) }
  }
  return hashes
}

function dataUrlToBlob(dataUrl) {
  if (!validPdfDataUrl(dataUrl)) throw new Error('Generated PDF data must be a PDF data URL.')
  const [header, encoded] = dataUrl.split(',')
  const type = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream'
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  return new Blob([bytes], { type })
}

export {
  ExternalFileChangedError,
  PROFILE_FORMAT,
  PROFILE_SCHEMA_VERSION,
  applyPortableProfile,
  buildPortableProfile,
  createFolderObserver,
  dataUrlToBlob,
  findProfileName,
  pdfFilename,
  profileFilename,
  readFileText,
  sha256,
  validatePortableProfile,
  writeFile,
  writePdfAssets,
  writeProfileSafely,
}
