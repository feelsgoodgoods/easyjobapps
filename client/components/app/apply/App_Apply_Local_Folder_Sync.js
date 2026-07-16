import React, { useEffect, useRef, useState } from 'react'
import { route } from '../../../router.js'
import { getIndexedDbItem, setIndexedDbItem } from '../../../table.js'
import {
  ExternalFileChangedError,
  applyPortableProfile,
  buildPortableProfile,
  createFolderObserver,
  findProfileName,
  migrateProfileFile,
  profileFilename,
  readFileText,
  sha256,
  validatePortableProfile,
  writeDocumentAssets,
  writePdfAssets,
  writeProfileSafely,
} from '../local-folder-sync.js'

const FOLDER_SYNC_KEY = 'easyJobAppsLocalFolderSync'

function stateHash(userData, postData) {
  const profile = buildPortableProfile(userData, postData)
  return sha256(JSON.stringify({ profile: profile.profile, currentApplication: profile.currentApplication }))
}

async function permissionFor(handle, request = false) {
  let permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission !== 'granted' && request) permission = await handle.requestPermission({ mode: 'readwrite' })
  return permission
}

function LocalFolderSync({ visible, userData, postData, setUserData, setPostData, showToast }) {
  const supported = typeof window.showDirectoryPicker === 'function'
  const observerSupported = location.protocol === 'chrome-extension:' && typeof globalThis.FileSystemObserver === 'function'
  const owner = userData?.username || 'guest'
  const folderSyncKey = `${FOLDER_SYNC_KEY}:${owner}`
  const [record, setRecord] = useState(null)
  const [status, setStatus] = useState('Loading local folder settings...')
  const [busy, setBusy] = useState(false)
  const recordRef = useRef(null)
  const queueRef = useRef(Promise.resolve())
  const keyRef = useRef(folderSyncKey)
  keyRef.current = folderSyncKey

  const saveRecord = async (next) => {
    const owned = { ...next, owner }
    await setIndexedDbItem(folderSyncKey, owned)
    if (keyRef.current === folderSyncKey) {
      recordRef.current = owned
      setRecord(owned)
    }
    return owned
  }

  const enqueue = (operation) => {
    queueRef.current = queueRef.current.then(operation, operation)
    return queueRef.current
  }

  useEffect(() => {
    let active = true
    recordRef.current = null
    setRecord(null)
    setStatus('Loading local folder settings...')
    ;(async () => {
      try {
        const saved = await getIndexedDbItem(folderSyncKey)
        if (!active) return
        if (saved && saved.owner !== owner) throw new Error('The saved folder belongs to another Easy Job Apps profile.')
        recordRef.current = saved
        setRecord(saved)
        if (!supported) return setStatus('Local folder synchronization is not supported in this browser.')
        if (!saved?.enabled) return setStatus('Local folder synchronization is disabled.')
        if (!saved?.handle) return setStatus('Choose a folder to begin synchronization.')
        if (saved.needsPull) return setStatus('The local profile has changes. Press Sync now before Easy Job Apps writes to it.')
        const permission = await permissionFor(saved.handle)
        if (permission === 'granted' && saved.profileName !== profileFilename()) {
          try {
            const migrated = await migrateProfileFile(saved.handle, saved.profileName, owner, saved.lastFileHash)
            if (!active) return
            await saveRecord({ ...saved, profileName: migrated.name, lastFileHash: migrated.hash })
          } catch (error) {
            if (error instanceof ExternalFileChangedError) {
              await saveRecord({ ...saved, needsPull: true })
              return setStatus('The local profile has changes. Press Sync now before Easy Job Apps writes to it.')
            }
            throw error
          }
        }
        setStatus(permission === 'granted' ? `Connected to ${saved.handle.name}.` : 'Folder permission is required. Press Sync now to reconnect.')
      } catch (error) {
        console.error('Unable to restore local folder synchronization:', error)
        setStatus('Unable to restore the local folder connection.')
      }
    })()
    return () => { active = false }
  }, [supported, folderSyncKey, owner])

  useEffect(() => {
    if (!observerSupported || record?.owner !== owner || !record?.enabled || !record?.handle) return
    let cancelled = false
    let stop = () => {}
    ;(async () => {
      try {
        if (await permissionFor(record.handle) !== 'granted') return
        const disconnect = createFolderObserver(record.handle)
        stop = disconnect
        await disconnect.ready
        if (cancelled) disconnect()
      } catch (error) {
        console.warn('Unable to start the FileSystemObserver experiment:', error)
      }
    })()
    return () => {
      cancelled = true
      stop()
    }
  }, [observerSupported, owner, record?.owner, record?.enabled, record?.handle])

  useEffect(() => {
    if (!record?.enabled || !record?.handle || !userData) return
    const timer = setTimeout(() => enqueue(async () => {
      const current = recordRef.current
      if (current?.owner !== owner || !current.enabled || await permissionFor(current.handle) !== 'granted') return
      if (current.needsPull) {
        setStatus('The local profile has changes. Press Sync now before Easy Job Apps writes to it.')
        return
      }
      const nextStateHash = await stateHash(userData, postData)
      if (nextStateHash === current.lastStateHash) return
      try {
        const profile = buildPortableProfile(userData, postData, {
          revision: current.revision,
          createdAt: current.createdAt,
        })
        const written = await writeProfileSafely(current.handle, current.profileName, profile, current.lastFileHash)
        await saveRecord({
          ...current,
          needsPull: false,
          revision: profile.revision,
          createdAt: profile.createdAt,
          lastFileHash: written.hash,
          lastStateHash: nextStateHash,
        })
        setStatus(`Connected to ${current.handle.name}.`)
      } catch (error) {
        if (error instanceof ExternalFileChangedError) {
          await saveRecord({ ...recordRef.current, needsPull: true })
          setStatus('The profile was edited outside Easy Job Apps. Press Sync now to pull those changes.')
          return
        }
        console.error('Unable to update the local Easy Job Apps profile:', error)
        setStatus('Unable to update the local profile.')
      }
    }), 600)
    return () => clearTimeout(timer)
  }, [owner, userData, postData, record?.enabled, record?.handle])

  useEffect(() => {
    const hasGeneratedPdf = postData?.resume64 || postData?.coverletter64
    const hasSavedDocument = userData?.resumes?.length || userData?.coverletters?.length
      || userData?.editorData?.resume?.file || userData?.editorData?.coverletter?.file
    if (!record?.enabled || !record?.handle || (!hasGeneratedPdf && !hasSavedDocument)) return
    const timer = setTimeout(() => enqueue(async () => {
      const current = recordRef.current
      if (current?.owner !== owner || !current.enabled || await permissionFor(current.handle) !== 'granted') return
      try {
        let assetHashes = await writePdfAssets(current.handle, postData, current.assetHashes)
        assetHashes = await writeDocumentAssets(current.handle, userData, assetHashes)
        if (JSON.stringify(assetHashes) !== JSON.stringify(current.assetHashes || {})) {
          await saveRecord({ ...current, assetHashes })
        }
      } catch (error) {
        console.error('Unable to save documents to the local package:', error)
        if (error.assetHashes && JSON.stringify(error.assetHashes) !== JSON.stringify(current.assetHashes || {})) {
          await saveRecord({ ...current, assetHashes: error.assetHashes })
        }
        if (error instanceof ExternalFileChangedError) {
          setStatus('A local package document changed outside Easy Job Apps and was not overwritten.')
        }
      }
    }), 600)
    return () => clearTimeout(timer)
  }, [owner, userData, postData, record?.enabled, record?.handle])

  const toggleSync = async (event) => {
    const enabled = event.target.checked
    setBusy(true)
    try {
      await enqueue(async () => {
        const next = { ...recordRef.current, enabled }
        await saveRecord(next)
        if (!enabled) return setStatus('Local folder synchronization is disabled.')
        if (!next.handle) return setStatus('Choose a folder to begin synchronization.')
        if (next.needsPull) return setStatus('The local profile has changes. Press Sync now before Easy Job Apps writes to it.')
        const permission = await permissionFor(next.handle)
        setStatus(permission === 'granted' ? `Connected to ${next.handle.name}.` : 'Folder permission is required. Press Sync now to reconnect.')
      })
    } finally {
      setBusy(false)
    }
  }

  const chooseFolder = async () => {
    if (!supported) return
    try {
      const handle = await window.showDirectoryPicker({ id: 'easy-job-apps', mode: 'readwrite', startIn: 'downloads' })
      setBusy(true)
      await enqueue(async () => {
        const foundName = await findProfileName(handle, recordRef.current?.profileName, owner)
        let name = foundName || profileFilename()
        let existingContents = foundName ? await readFileText(handle, name) : null
        const profile = existingContents
          ? validatePortableProfile(JSON.parse(existingContents))
          : buildPortableProfile(userData, postData)
        if (profile.profile.username !== owner) throw new Error('The selected profile belongs to another Easy Job Apps user.')
        let fileHash = existingContents
          ? await sha256(existingContents)
          : (await writeProfileSafely(handle, name, profile)).hash
        if (existingContents && name !== profileFilename()) {
          const migrated = await migrateProfileFile(handle, name, owner, fileHash)
          name = migrated.name
          existingContents = migrated.contents
          fileHash = migrated.hash
        }
        const next = {
          enabled: true,
          handle,
          profileName: name,
          needsPull: !!existingContents,
          revision: profile.revision,
          createdAt: profile.createdAt,
          lastFileHash: fileHash,
          lastStateHash: await stateHash(userData, postData),
          assetHashes: {},
        }
        if (!existingContents) {
          next.assetHashes = await writePdfAssets(handle, postData, next.assetHashes)
          next.assetHashes = await writeDocumentAssets(handle, userData, next.assetHashes)
        }
        await saveRecord(next)
        setStatus(foundName ? `Existing profile found in ${handle.name}. Press Sync now to pull it.` : `Connected to ${handle.name}.`)
        showToast('Local folder connected.')
      })
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Unable to choose the local synchronization folder:', error)
        setStatus('Unable to connect the selected folder.')
      }
    } finally {
      setBusy(false)
    }
  }

  const syncNow = async () => {
    const current = recordRef.current
    if (!current?.handle || current.owner !== owner) return chooseFolder()
    setBusy(true)
    try {
      const permission = await permissionFor(current.handle, true)
      if (permission !== 'granted') throw new Error('Read/write permission was not granted.')
      await enqueue(async () => {
        const connected = recordRef.current
        if (connected?.owner !== owner) return
        const contents = await readFileText(connected.handle, connected.profileName)
        if (!contents) throw new Error('The connected Easy Job Apps profile could not be found.')
        const profile = validatePortableProfile(JSON.parse(contents))
        if (profile.profile.username !== owner) throw new Error('The connected profile belongs to another Easy Job Apps user.')
        const updatedUser = await applyPortableProfile(profile, userData, { route, setUserData, setPostData })
        const migrated = await migrateProfileFile(connected.handle, connected.profileName, owner, await sha256(contents))
        await saveRecord({
          ...connected,
          profileName: migrated.name,
          needsPull: false,
          revision: profile.revision,
          createdAt: profile.createdAt,
          lastFileHash: migrated.hash,
          lastStateHash: await stateHash(updatedUser, profile.currentApplication),
        })
        setStatus(`Pulled revision ${profile.revision} from ${connected.handle.name}.`)
        showToast('Local folder synchronized.')
      })
    } catch (error) {
      console.error('Unable to pull the local Easy Job Apps profile:', error)
      setStatus(error?.message || 'Unable to synchronize the local folder.')
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div style={{ margin: '12px 10px 10px' }}>
      <h2>Local Folder</h2>
      <label>
        <input
          type="checkbox"
          checked={!!record?.enabled}
          disabled={!supported || busy}
          onChange={toggleSync}
        />
        {' '}Sync with a local folder
      </label>
      <p style={{ margin: '8px 0' }}>{status}</p>
      {record?.profileName && <p style={{ margin: '8px 0' }}>Profile: {record.profileName}</p>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" disabled={!supported || busy} onClick={chooseFolder}>
          {record?.handle ? 'Choose Another Folder' : 'Choose Folder'}
        </button>
        {record?.handle && record?.enabled && (
          <button type="button" disabled={busy} onClick={syncNow}>Sync Now</button>
        )}
      </div>
      <small style={{ display: 'block', marginTop: '8px' }}>
        The profile JSON syncs both ways. Generated PDFs, uploaded PDFs, and saved document text are export-only local package files. Credentials and API keys are excluded.
      </small>
      <small style={{ display: 'block', marginTop: '8px' }}>
        FileSystemObserver test: {observerSupported ? 'logging events while this panel is open' : 'not available in this extension context'}.
      </small>
    </div>
  )
}

export default LocalFolderSync
