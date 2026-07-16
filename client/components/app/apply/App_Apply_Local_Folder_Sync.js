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
  pushPortableProfilePackage,
  readFileText,
  sha256,
  validatePortableProfile,
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

const iconButtonStyle = {
  alignItems: 'center',
  display: 'inline-flex',
  height: '32px',
  justifyContent: 'center',
  padding: '0',
  width: '32px',
}

function IconSvg({ children }) {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
      {children}
    </svg>
  )
}

function FolderIcon() {
  return (
    <IconSvg>
      <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 10h18" />
    </IconSvg>
  )
}

function PullIcon() {
  return (
    <IconSvg>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconSvg>
  )
}

function PushIcon() {
  return (
    <IconSvg>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </IconSvg>
  )
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
        if (saved.needsPull) return setStatus('The local profile has changes. Press Pull before Easy Job Apps writes to it.')
        const permission = await permissionFor(saved.handle)
        setStatus(permission === 'granted' ? `Connected to ${saved.handle.name}.` : 'Folder permission is required. Press Pull or Push to reconnect.')
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

  const toggleSync = async (event) => {
    const enabled = event.target.checked
    setBusy(true)
    try {
      await enqueue(async () => {
        const next = { ...recordRef.current, enabled }
        await saveRecord(next)
        if (!enabled) return setStatus('Local folder synchronization is disabled.')
        if (!next.handle) return setStatus('Choose a folder to begin synchronization.')
        if (next.needsPull) return setStatus('The local profile has changes. Press Pull before Easy Job Apps writes to it.')
        const permission = await permissionFor(next.handle)
        setStatus(permission === 'granted' ? `Connected to ${next.handle.name}.` : 'Folder permission is required. Press Pull or Push to reconnect.')
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
        const name = foundName || profileFilename()
        const existingContents = foundName ? await readFileText(handle, name) : null
        const profile = existingContents
          ? validatePortableProfile(JSON.parse(existingContents))
          : null
        if (profile?.profile.username !== owner) throw new Error('The selected profile belongs to another Easy Job Apps user.')
        const fileHash = existingContents
          ? await sha256(existingContents)
          : null
        const next = {
          enabled: true,
          handle,
          profileName: name,
          needsPull: !!existingContents,
          revision: profile?.revision || 0,
          createdAt: profile?.createdAt || null,
          lastFileHash: fileHash,
          lastStateHash: existingContents ? await sha256(JSON.stringify({
            profile: profile.profile,
            currentApplication: profile.currentApplication,
          })) : null,
          assetHashes: {},
        }
        await saveRecord(next)
        setStatus(foundName ? `Existing profile found in ${handle.name}. Press Pull to import it.` : `Connected to ${handle.name}. Press Push to save this profile locally.`)
        showToast('Local folder selected.')
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

  const pullProfile = async () => {
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
        const expectedKey = folderSyncKey
        const assertActive = () => {
          if (keyRef.current !== expectedKey || recordRef.current?.owner !== owner
            || recordRef.current?.handle !== connected.handle) {
            throw new Error('The active Easy Job Apps account or folder changed during synchronization.')
          }
        }
        const ownedRoute = (...args) => {
          assertActive()
          return route(...args)
        }
        const updatedUser = await applyPortableProfile(profile, userData, {
          route: ownedRoute,
          setUserData,
          setPostData,
          assertActive,
        })
        assertActive()
        const migrated = await migrateProfileFile(
          connected.handle,
          connected.profileName,
          owner,
          await sha256(contents),
          connected.assetHashes,
        )
        await saveRecord({
          ...connected,
          profileName: migrated.name,
          needsPull: false,
          revision: profile.revision,
          createdAt: profile.createdAt,
          lastFileHash: migrated.hash,
          lastStateHash: await stateHash(updatedUser, profile.currentApplication),
          assetHashes: { ...connected.assetHashes, ...migrated.assetHashes },
        })
        setStatus(`Pulled revision ${profile.revision} from ${connected.handle.name}.`)
        showToast('Local profile pulled.')
      })
    } catch (error) {
      console.error('Unable to pull the local Easy Job Apps profile:', error)
      const latest = recordRef.current
      if (error.assetHashes && latest?.owner === owner) {
        await saveRecord({ ...latest, assetHashes: { ...latest.assetHashes, ...error.assetHashes } })
      }
      setStatus(error?.message || 'Unable to synchronize the local folder.')
    } finally {
      setBusy(false)
    }
  }

  const pushProfile = async () => {
    const current = recordRef.current
    if (!current?.handle || current.owner !== owner) return chooseFolder()
    setBusy(true)
    try {
      const permission = await permissionFor(current.handle, true)
      if (permission !== 'granted') throw new Error('Read/write permission was not granted.')
      await enqueue(async () => {
        const connected = recordRef.current
        if (keyRef.current !== folderSyncKey || connected?.owner !== owner || connected?.handle !== current.handle) {
          throw new Error('The active Easy Job Apps account or folder changed during synchronization.')
        }
        const pushed = await pushPortableProfilePackage(connected.handle, connected, userData, postData, { owner })
        if (keyRef.current !== folderSyncKey || recordRef.current?.owner !== owner
          || recordRef.current?.handle !== connected.handle) {
          throw new Error('The active Easy Job Apps account or folder changed during synchronization.')
        }
        await saveRecord({
          ...connected,
          profileName: pushed.profileName,
          needsPull: false,
          revision: pushed.revision,
          createdAt: pushed.createdAt,
          lastFileHash: pushed.lastFileHash,
          lastStateHash: await stateHash(userData, postData),
          assetHashes: pushed.assetHashes,
        })
        setStatus(`Pushed revision ${pushed.revision} to ${connected.handle.name}.`)
        showToast('Local profile pushed.')
      })
    } catch (error) {
      console.error('Unable to push the local Easy Job Apps profile:', error)
      const latest = recordRef.current
      if (error.assetHashes && latest?.owner === owner) {
        await saveRecord({ ...latest, assetHashes: { ...latest.assetHashes, ...error.assetHashes } })
        setStatus('A local package document changed outside Easy Job Apps and was not overwritten.')
      } else if (error instanceof ExternalFileChangedError && latest?.owner === owner) {
        await saveRecord({ ...latest, needsPull: true })
        setStatus('The profile was edited outside Easy Job Apps. Press Pull before pushing local changes.')
      } else {
        setStatus(error?.message || 'Unable to push the local folder.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  const folderButtonLabel = record?.handle ? 'Choose another local folder' : 'Choose local folder'

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
        <button
          aria-label={folderButtonLabel}
          disabled={!supported || busy}
          onClick={chooseFolder}
          style={iconButtonStyle}
          title={folderButtonLabel}
          type="button"
        >
          <FolderIcon />
        </button>
        {record?.handle && record?.enabled && (
          <>
            <button
              aria-label="Pull local profile"
              disabled={busy}
              onClick={pullProfile}
              style={iconButtonStyle}
              title="Pull local profile"
              type="button"
            >
              <PullIcon />
            </button>
            <button
              aria-label="Push local profile"
              disabled={busy || record?.needsPull}
              onClick={pushProfile}
              style={iconButtonStyle}
              title="Push local profile"
              type="button"
            >
              <PushIcon />
            </button>
          </>
        )}
      </div>
      <small style={{ display: 'block', marginTop: '8px' }}>
        Pull imports the profile JSON. Push writes the profile JSON plus generated PDFs, available uploaded PDFs, and saved document text. Credentials and API keys are excluded.
      </small>
      <small style={{ display: 'block', marginTop: '8px' }}>
        FileSystemObserver test: {observerSupported ? 'logging events while this panel is open' : 'not available in this extension context'}.
      </small>
    </div>
  )
}

export default LocalFolderSync
