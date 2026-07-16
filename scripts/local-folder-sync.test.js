import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ExternalFileChangedError,
  applyPortableProfile,
  buildPortableProfile,
  createFolderObserver,
  findProfileName,
  migrateProfileFile,
  profileFilename,
  pdfFilename,
  sha256,
  validatePortableProfile,
  writeDocumentAssets,
  writePdfAssets,
  writeProfileSafely,
} from '../client/components/app/local-folder-sync.js'

class MemoryFileHandle {
  constructor(name) {
    this.name = name
    this.contents = ''
  }

  async getFile() {
    const contents = this.contents
    return {
      text: async () => typeof contents === 'string' ? contents : contents.text(),
      arrayBuffer: async () => typeof contents === 'string'
        ? new TextEncoder().encode(contents).buffer
        : contents.arrayBuffer(),
    }
  }

  async createWritable() {
    return {
      write: async (contents) => {
        this.contents = contents
      },
      close: async () => {},
    }
  }
}

class MemoryDirectoryHandle {
  constructor(name = 'Easy Job Apps') {
    this.name = name
    this.files = new Map()
  }

  async getFileHandle(name, options = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw new DOMException('Missing file', 'NotFoundError')
      this.files.set(name, new MemoryFileHandle(name))
    }
    return this.files.get(name)
  }

  async *values() {
    for (const file of this.files.values()) yield { ...file, kind: 'file' }
  }

  async removeEntry(name) {
    if (!this.files.delete(name)) throw new DOMException('Missing file', 'NotFoundError')
  }
}

const date = new Date(2026, 6, 16, 12)

function userData() {
  return {
    username: 'Carlos',
    jwt: 'do-not-export',
    openaikey: [{ text: 'do-not-export' }],
    creditsBought: '10',
    applySettings: [{ text: { continuousMode: true } }],
    bio: [{ text: 'Bio text' }],
    resumes: [{ id: 7, title: 'Main Resume', text: JSON.stringify({ id: 7, title: 'Main Resume', template: 'Expanded' }) }],
    coverletters: [{ id: 9, title: 'Main Cover Letter', text: JSON.stringify({ id: 9, title: 'Main Cover Letter', template: 'Expanded' }) }],
  }
}

test('portable profile preserves application data without exporting credentials or database ids', () => {
  const profile = buildPortableProfile(userData(), {
    id: 42,
    user_id: 12,
    companyName: 'Acme',
    jobTitle: 'Engineer',
    meta: { internal: true },
    status: 'working',
    resume64: 'data:application/pdf;base64,JVBERi0xLjQgcmVzdW1l',
  }, { now: date, revision: 3 })

  assert.equal(profile.format, 'easy-job-apps-profile')
  assert.equal(profile.schemaVersion, 1)
  assert.equal(profile.revision, 4)
  assert.equal(profile.profile.username, 'Carlos')
  assert.deepEqual(profile.profile.applySettings, { continuousMode: true })
  assert.equal(profile.profile.bio, 'Bio text')
  assert.deepEqual(profile.profile.resumes, [{ title: 'Main Resume', text: { title: 'Main Resume', template: 'Expanded' } }])
  assert.equal('resume64' in profile.currentApplication, false)
  assert.equal('coverletter64' in profile.currentApplication, false)
  assert.equal('id' in profile.currentApplication, false)
  assert.equal('user_id' in profile.currentApplication, false)
  assert.equal('meta' in profile.currentApplication, false)
  assert.equal('status' in profile.currentApplication, false)
  assert.equal('jwt' in profile.profile, false)
  assert.equal('openaikey' in profile.profile, false)
  assert.equal('creditsBought' in profile.profile, false)
})

test('portable profile normalizes stored JSON settings into editable objects', () => {
  const stored = userData()
  stored.applySettings = [{ text: '{"continuousMode":false}' }]
  assert.deepEqual(buildPortableProfile(stored, {}, { now: date }).profile.applySettings, { continuousMode: false })
})

test('profile name is stable while PDF names are date-first and filesystem-safe', () => {
  assert.equal(profileFilename('Carlos / Agent', date), 'easy-job-apps-profile.json')
  assert.equal(
    pdfFilename({ id: 42, companyName: 'Acme / Labs', jobTitle: 'Senior: Engineer' }, 'resume', date),
    '2026-07-16_Acme-Labs_Senior-Engineer_42_resume.pdf',
  )
  assert.equal(pdfFilename({ id: '../../escape' }, 'resume', date).includes('../'), false)
})

test('folder connection reuses the newest existing portable profile', async () => {
  const directory = new MemoryDirectoryHandle()
  await directory.getFileHandle('2026-07-14_Carlos_easy-job-apps-profile.json', { create: true })
  await directory.getFileHandle('2026-07-15_Carlos_easy-job-apps-profile.json', { create: true })
  await directory.getFileHandle('2026-07-16_Naomi_easy-job-apps-profile.json', { create: true })
  await directory.getFileHandle('notes.txt', { create: true })

  assert.equal(await findProfileName(directory, null, 'Carlos'), '2026-07-15_Carlos_easy-job-apps-profile.json')
  assert.equal(await findProfileName(directory, '2026-07-14_Carlos_easy-job-apps-profile.json', 'Carlos'), '2026-07-14_Carlos_easy-job-apps-profile.json')
  await directory.getFileHandle('easy-job-apps-profile.json', { create: true })
  assert.equal(await findProfileName(directory, '2026-07-14_Carlos_easy-job-apps-profile.json', 'Carlos'), 'easy-job-apps-profile.json')
})

test('dated profiles migrate to the single stable profile filename', async () => {
  const directory = new MemoryDirectoryHandle()
  const legacyName = '2026-07-15_Carlos_easy-job-apps-profile.json'
  const profile = buildPortableProfile(userData(), {}, { now: date })
  const legacy = await writeProfileSafely(directory, legacyName, profile)

  const migrated = await migrateProfileFile(directory, legacyName, 'Carlos', legacy.hash)

  assert.equal(migrated.name, 'easy-job-apps-profile.json')
  assert.equal(directory.files.has(legacyName), false)
  assert.equal(directory.files.has('easy-job-apps-profile.json'), true)
  assert.deepEqual(JSON.parse(directory.files.get('easy-job-apps-profile.json').contents), profile)

  const recovered = await migrateProfileFile(directory, legacyName, 'Carlos', legacy.hash)
  assert.equal(recovered.name, 'easy-job-apps-profile.json')
  assert.equal(recovered.hash, migrated.hash)
})

test('stable profiles are normalized without legacy PDF payloads', async () => {
  const directory = new MemoryDirectoryHandle()
  const name = 'easy-job-apps-profile.json'
  const profile = buildPortableProfile(userData(), {}, { now: date })
  profile.currentApplication.resume64 = 'data:application/pdf;base64,JVBERi0xLjQgcmVzdW1l'
  const handle = await directory.getFileHandle(name, { create: true })
  handle.contents = JSON.stringify(profile, null, 2)

  const migrated = await migrateProfileFile(directory, name, 'Carlos', await sha256(handle.contents))

  assert.equal('resume64' in JSON.parse(migrated.contents).currentApplication, false)
  assert.equal(directory.files.size, 1)
})

test('portable profile validation rejects unknown or malformed documents', () => {
  assert.throws(() => validatePortableProfile({}), /Easy Job Apps profile/)
  assert.throws(
    () => validatePortableProfile({ format: 'easy-job-apps-profile', schemaVersion: 2, profile: {}, currentApplication: {} }),
    /schema version/,
  )
  const profile = buildPortableProfile(userData(), {}, { now: date })
  assert.throws(() => validatePortableProfile({ ...profile, jwt: 'unexpected' }), /Unknown profile field/)
  assert.throws(() => validatePortableProfile({ ...profile, profile: { ...profile.profile, openaikey: [] } }), /Unknown portable profile field/)
  assert.throws(() => validatePortableProfile({
    ...profile,
    profile: { ...profile.profile, applySettings: { unexpected: true } },
  }), /Unknown apply setting/)
  assert.throws(() => validatePortableProfile({
    ...profile,
    profile: { ...profile.profile, resumes: [{ title: 'Broken', text: null }] },
  }), /invalid template/)
  assert.throws(() => validatePortableProfile({
    ...profile,
    profile: { ...profile.profile, resumes: [profile.profile.resumes[0], profile.profile.resumes[0]] },
  }), /duplicate template title/)
  assert.throws(() => validatePortableProfile({ ...profile, currentApplication: { meta: {} } }), /Unknown current application field/)
  assert.throws(() => validatePortableProfile({ ...profile, currentApplication: { companyName: [] } }), /invalid current application value/)
  assert.throws(() => validatePortableProfile({
    ...profile,
    currentApplication: { resume64: 'data:text/html;base64,PGgxPm5vPC9oMT4=' },
  }), /invalid current application value/)

  const legacy = structuredClone(profile)
  legacy.currentApplication.resume64 = 'data:application/pdf;base64,JVBERi0xLjQgcmVzdW1l'
  validatePortableProfile(legacy)
  assert.equal('resume64' in legacy.currentApplication, false)
})

test('safe profile writes refuse to overwrite an externally edited file', async () => {
  const directory = new MemoryDirectoryHandle()
  const name = profileFilename('Carlos', date)
  const first = buildPortableProfile(userData(), {}, { now: date })
  const initial = await writeProfileSafely(directory, name, first)

  await assert.rejects(
    writeProfileSafely(directory, name, buildPortableProfile(userData(), { id: 2 }, { now: date, revision: 1 })),
    ExternalFileChangedError,
  )

  directory.files.delete(name)
  await assert.rejects(
    writeProfileSafely(directory, name, buildPortableProfile(userData(), {}, { now: date, revision: 1 }), initial.hash),
    ExternalFileChangedError,
  )
  await directory.getFileHandle(name, { create: true })
  directory.files.get(name).contents = JSON.stringify({ changedBy: 'openclaw' })

  await assert.rejects(
    writeProfileSafely(directory, name, buildPortableProfile(userData(), { id: 2 }, { now: date, revision: 1 }), initial.hash),
    ExternalFileChangedError,
  )
  assert.equal(directory.files.get(name).contents, JSON.stringify({ changedBy: 'openclaw' }))
})

test('FileSystemObserver experiment only logs received event records', async () => {
  const directory = new MemoryDirectoryHandle()
  const calls = []
  let observer

  class FakeObserver {
    constructor(callback) {
      this.callback = callback
      observer = this
    }

    async observe(handle, options) {
      calls.push(['observe', handle, options])
    }

    disconnect() {
      calls.push(['disconnect'])
    }
  }

  const stop = createFolderObserver(directory, FakeObserver, (...args) => calls.push(['log', ...args]))
  await stop.ready
  const records = [{ type: 'modified', relativePathComponents: ['profile.json'] }]
  observer.callback(records)

  assert.deepEqual(calls[0], ['observe', directory, { recursive: false }])
  assert.deepEqual(calls[1], ['log', 'Easy Job Apps FileSystemObserver event:', records])
  assert.equal(calls.length, 2)

  stop()
  stop()
  assert.deepEqual(calls[2], ['disconnect'])
  observer.callback(records)
  assert.equal(calls.length, 3)
})

test('FileSystemObserver cleanup disconnects when observation startup fails', async () => {
  let disconnects = 0
  class RejectingObserver {
    constructor() {}
    observe() { throw new Error('unsupported handle') }
    disconnect() { disconnects += 1 }
  }
  const stop = createFolderObserver(new MemoryDirectoryHandle(), RejectingObserver)
  await assert.rejects(stop.ready, /unsupported handle/)
  stop()
  assert.equal(disconnects, 1)
})

test('pull applies portable settings through existing routes and updates existing React state', async () => {
  const profile = buildPortableProfile(userData(), { id: 42 }, { now: date })
  const calls = []
  let nextId = 100
  const stored = userData()
  stored.resumes.push({ id: 8, title: 'Remove Me', text: 'old' })
  let resumes = structuredClone(stored.resumes)
  let coverletters = structuredClone(stored.coverletters)
  const route = async (body, endpoint) => {
    calls.push([endpoint, body])
    if (endpoint === '/userinfo_upload') {
      const record = { id: nextId++, title: body.title, text: body.text }
      ;(body.label === 'resumetemplates' ? resumes : coverletters).push(record)
      return record
    }
    if (endpoint === '/userinfo_update') {
      for (const records of [resumes, coverletters]) {
        const index = records.findIndex((record) => record.id === body.userinfoid)
        if (index >= 0) records[index] = { ...records[index], ...body }
      }
      return true
    }
    if (endpoint === '/userinfo_remove') {
      resumes = resumes.filter((record) => record.id !== body.userinfoid)
      coverletters = coverletters.filter((record) => record.id !== body.userinfoid)
      return true
    }
    if (endpoint === '/userinfo_view/applysettings') return [{ text: profile.profile.applySettings }]
    if (endpoint === '/userinfo_view/bio') return [{ text: profile.profile.bio }]
    if (endpoint === '/userinfo_view/resumetemplates') return resumes
    if (endpoint === '/userinfo_view/coverlettertemplates') return coverletters
    return true
  }
  let updatedUser
  let updatedPost

  await applyPortableProfile(profile, stored, {
    route,
    setUserData: (value) => { updatedUser = value },
    setPostData: (value) => { updatedPost = value },
  })

  assert.deepEqual(calls[0], ['/userinfo_update_single', { applysettings: { continuousMode: true } }])
  assert.deepEqual(calls[2], ['/userinfo_update_single', { bio: 'Bio text' }])
  assert.equal(updatedUser.jwt, 'do-not-export')
  assert.equal(updatedUser.resumes[0].id, 7)
  assert.equal(JSON.parse(updatedUser.resumes[0].text).id, 7)
  assert.equal(updatedUser.coverletters[0].id, 9)
  assert.equal(calls.some(([endpoint]) => endpoint === '/userinfo_upload'), false)
  assert.equal(calls.some(([endpoint, body]) => endpoint === '/userinfo_remove' && body.userinfoid === 8), true)
  assert.equal(updatedUser.resumes.some((record) => record.title === 'Remove Me'), false)
  assert.deepEqual(updatedPost, profile.currentApplication)
})

test('pull uses persisted values when guest-mode dynamic reload routes are unavailable', async () => {
  const guest = { ...userData(), username: 'guest', resumes: [], coverletters: [] }
  const profile = buildPortableProfile(guest, {}, { now: date })
  let updatedUser
  let updatedPost

  await applyPortableProfile(profile, guest, {
    route: async (body, endpoint) => endpoint.startsWith('/userinfo_view/') ? false : true,
    setUserData: (value) => { updatedUser = value },
    setPostData: (value) => { updatedPost = value },
  })

  assert.deepEqual(updatedUser.applySettings, [{ text: profile.profile.applySettings }])
  assert.deepEqual(updatedUser.bio, [{ text: profile.profile.bio }])
  assert.deepEqual(updatedUser.resumes, [])
  assert.deepEqual(updatedUser.coverletters, [])
  assert.deepEqual(updatedPost, profile.currentApplication)
})

test('profile pull ignores export-only package documents', async () => {
  const guest = { ...userData(), username: 'guest', resumes: [], coverletters: [] }
  const profile = buildPortableProfile(guest, {}, { now: date })
  const directory = new MemoryDirectoryHandle()
  const textFile = await directory.getFileHandle('Resume_resume.txt', { create: true })
  const pdfFile = await directory.getFileHandle('2026-07-16_Resume_resume-original.pdf', { create: true })
  textFile.contents = 'Do not import this text'
  pdfFile.contents = new Blob(['%PDF-1.4 do not import'], { type: 'application/pdf' })
  const calls = []

  await applyPortableProfile(profile, guest, {
    route: async (body, endpoint) => {
      calls.push([endpoint, body])
      return endpoint.startsWith('/userinfo_view/') ? false : true
    },
    setUserData: () => {},
    setPostData: () => {},
  })

  assert.equal(JSON.stringify(calls).includes('Do not import'), false)
  assert.equal(textFile.contents, 'Do not import this text')
  assert.equal(await pdfFile.contents.text(), '%PDF-1.4 do not import')
})

test('pull fails without replacing React state when an existing persistence route fails', async () => {
  const profile = buildPortableProfile(userData(), {}, { now: date })
  let updated = false
  await assert.rejects(
    applyPortableProfile(profile, userData(), {
      route: async () => false,
      setUserData: () => { updated = true },
      setPostData: () => { updated = true },
    }),
    /apply settings/,
  )
  assert.equal(updated, false)
})

test('new PDF base64 values are mirrored once with date-first filenames', async () => {
  const directory = new MemoryDirectoryHandle()
  const postData = {
    id: 42,
    companyName: 'Acme',
    jobTitle: 'Engineer',
    resume64: 'data:application/pdf;base64,JVBERi0xLjQgcmVzdW1l',
    coverletter64: 'data:application/pdf;base64,JVBERi0xLjQgY292ZXI=',
  }

  const hashes = await writePdfAssets(directory, postData, {}, date)
  assert.deepEqual([...directory.files.keys()], [
    '2026-07-16_Acme_Engineer_42_resume.pdf',
    '2026-07-16_Acme_Engineer_42_coverletter.pdf',
  ])
  assert.equal(Object.keys(hashes).length, 2)

  await writePdfAssets(directory, postData, hashes, date)
  await writePdfAssets(directory, postData, hashes, new Date(2026, 6, 17, 12))
  assert.equal(directory.files.size, 2)

  const secondJob = { ...postData, id: 43, jobTitle: 'Architect' }
  const secondHashes = await writePdfAssets(directory, secondJob, hashes, date)
  assert.equal(directory.files.size, 4)

  directory.files.get('2026-07-16_Acme_Engineer_42_resume.pdf').contents = new Blob(['external edit'], { type: 'application/pdf' })
  await assert.rejects(
    writePdfAssets(directory, { ...postData, resume64: 'data:application/pdf;base64,JVBERi0xLjQgbmV3' }, secondHashes, date),
    ExternalFileChangedError,
  )
})

test('saved documents export stable text files and available original PDFs', async () => {
  const directory = new MemoryDirectoryHandle()
  const originalPdf = new Blob(['%PDF-1.4 original'], { type: 'application/pdf' })
  const documents = {
    resumes: [{ title: 'Main Resume', text: JSON.stringify({ title: 'Main Resume', text: 'Resume body' }) }],
    coverletters: [{ title: 'General Letter', text: 'Cover letter body' }],
    editorData: { resume: { title: 'Main Resume', file: originalPdf } },
  }

  const hashes = await writeDocumentAssets(directory, documents, {}, date)
  assert.deepEqual([...directory.files.keys()].sort(), [
    '2026-07-16_Main-Resume_resume-original.pdf',
    'General-Letter_coverletter.txt',
    'Main-Resume_resume.txt',
  ])
  assert.equal(directory.files.get('Main-Resume_resume.txt').contents, 'Resume body')
  assert.equal(directory.files.get('General-Letter_coverletter.txt').contents, 'Cover letter body')

  await writeDocumentAssets(directory, documents, hashes, new Date(2026, 6, 17, 12))
  assert.equal(directory.files.size, 3)

  directory.files.get('Main-Resume_resume.txt').contents = 'external edit'
  await assert.rejects(
    writeDocumentAssets(directory, {
      ...documents,
      resumes: [{ title: 'Main Resume', text: JSON.stringify({ title: 'Main Resume', text: 'Updated resume body' }) }],
    }, hashes, date),
    ExternalFileChangedError,
  )
})

test('document export disambiguates path-equivalent saved titles', async () => {
  const directory = new MemoryDirectoryHandle()
  await writeDocumentAssets(directory, {
    resumes: [
      { id: 1, title: 'A/B', text: JSON.stringify({ text: 'First' }) },
      { id: 2, title: 'A:B', text: JSON.stringify({ text: 'Second' }) },
    ],
  }, {}, date)

  assert.deepEqual([...directory.files.keys()].sort(), ['A-B_1_resume.txt', 'A-B_2_resume.txt'])
})
