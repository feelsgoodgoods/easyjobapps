// service_worker.js - Does not need /build when testing

// content:SW trigger calls getPost(e) then passes resp postData to handleAutoLoad()
// content:apply() - calls getPost() runs fillForms. Nothing panel

// panel:handleAutoLoad() calls getPost() to retrieve postData from content if not given
// panel:apply(postData||null) - calls getPost() runs fillForms.

// content script needs to check req is attached and if so check if its a content or panel request
// check against menuItemId

const storageObj = {}

let sidePanelState = {
  isOpen: false,
  tabId: null,
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'qareply',
      title: 'Reply',
      contexts: ['all'],
    })
    chrome.contextMenus.create({
      id: 'loadJob',
      title: 'Load Job',
      contexts: ['all'],
    })
    chrome.contextMenus.create({
      id: 'apply',
      title: 'Apply',
      contexts: ['all'],
    })
  })

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

  chrome?.sidePanel?.onOpenStateChanged?.addListener((state) => {
    sidePanelState.isOpen = state.open
    sidePanelState.tabId = state.tabId
  })
})
console.log('Service Worker Loaded')

const DEV_WEBPACK_SOCKET = 'ws://localhost:3001/ws'
const DEV_WEBPACK_HASH_KEY = 'easyJobAppsDevWebpackHash'
const DEV_PENDING_TAB_RELOADS_KEY = 'easyJobAppsDevPendingTabReloads'
let devWebpackHash
let devWebpackReloading = false

function getStoredValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]))
  })
}

function setStoredValue(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}

function getActiveTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, resolve)
  })
}

function reloadTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.reload(tabId, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
}

async function reloadPendingTabs() {
  const tabIds = await getStoredValue(DEV_PENDING_TAB_RELOADS_KEY)
  if (!Array.isArray(tabIds) || !tabIds.length) return

  await setStoredValue(DEV_PENDING_TAB_RELOADS_KEY, [])
  await Promise.all(tabIds.map(reloadTab))
}

async function reloadAfterWebpackBuild(hash) {
  if (devWebpackReloading) return

  if (hash) {
    const previousHash = await getStoredValue(DEV_WEBPACK_HASH_KEY)
    if (previousHash === hash) return
    await setStoredValue(DEV_WEBPACK_HASH_KEY, hash)
  }

  devWebpackReloading = true
  const tabs = await getActiveTabs()
  const tabIds = tabs.map((tab) => tab.id).filter(Number.isInteger)
  await setStoredValue(DEV_PENDING_TAB_RELOADS_KEY, tabIds)
  chrome.runtime.reload()
}

function watchWebpackBuilds() {
  const socket = new WebSocket(DEV_WEBPACK_SOCKET)

  socket.onmessage = ({ data }) => {
    let message
    try {
      message = JSON.parse(data)
    } catch {
      return
    }

    if (message.type === 'hash') {
      devWebpackHash = message.data
    } else if (message.type === 'ok' || message.type === 'warnings') {
      reloadAfterWebpackBuild(devWebpackHash)
    } else if (message.type === 'static-changed') {
      reloadAfterWebpackBuild()
    }
  }

  socket.onclose = () => setTimeout(watchWebpackBuilds, 2000)
}

reloadPendingTabs()
watchWebpackBuilds()

// Add an event listener for the click event
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context Menu Clicked:', info)
  let resp
  if (info.menuItemId === 'loadJob') {
    chrome.sidePanel.open({ windowId: tab.windowId })
    resp = await chrome.tabs.sendMessage(tab.id, { toContentAction: 'getPost', data: info })
  }
  if (info.menuItemId === 'apply') {
    resp = await chrome.tabs.sendMessage(tab.id, { toContentAction: 'apply', data: info })
  }
  if (info.menuItemId === 'qareply') {
    resp = await chrome.tabs.sendMessage(tab.id, { toContentAction: 'qareply', data: info })
  }
  if (resp) {
    console.log('Context Menu Click Response:', resp)
  }
})
 

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  handleMessage(req).then(sendResponse).catch((error) => sendResponse({ error: error.message }))
  return true // Keeps the message channel open for async response if needed
})

// Only responds to SW Actions
async function handleMessage(req, sendResponse) {  
  let result = { test: 'testfailure' } 
  let data = req.data;
  let action = req.toSwAction  
  if (!action){ 
    // console.log('onMessage: No action', req) 
    return;
  }
  // console.log('onMessage:', req, action)  

  if (action == 'fetchData') {   
    result = await fetchData(req) 
    // console.log('RETURNING', result) 
  }  
  else if (action == 'openSidepanel') {
    chrome.windows.getCurrent({ populate: false }, (currentWindow) => {
      if (currentWindow && currentWindow.id) {
        // open or close the sidepanel
        chrome.sidePanel.open({ windowId: currentWindow.id });
      } else {
        console.error("Unable to determine current windowId");
      }
    }); 
  }
  else if (action == 'updatesw') { 
    update(req.key, req.value) // content-popup.updateSW
    result = { update: 'updated' } 
    // console.log('UpdatedSw', result)
  } 
  else{ 
    console.log('DONE') 
  }  
  return result
} 

async function loadUserData() {
  const result = await new Promise((resolve) => {
    chrome.storage.local.get(['userData'], (result) => {
      resolve(result)
    })
  })
  let userData = result.userData
  storageObj.userData = result.userData
  // delete userData.openaikey; // delete userData.jwt;
  return userData
}
const update = (key, value) => {
  // console.log('SW-GetChromeStorage')
  loadUserData()
  //   storageObj[key] = value;
  //   if (key === 'userData') { chrome.storage.local.set({ [key]: value }, () => { sendResponse({ status: 'success', message: 'userData stored successfully' }); }); }
  //   else { return({ status: 'success', message: `${key} updated in memory but not in storage` }); }
  return true
}
const fetchData = async (req) => {
  const { url, options } = req
  let useUrl = url
  const userData = await loadUserData() 

  // if req is to openAI and no openaikey then redirect w/ jwt.
  if (url?.includes('openai.com')) {
    const openAiRecord = userData?.openaikey || '{}'
    const openaikey = openAiRecord?.[0]?.text
    const jwt = storageObj?.jwt
    const creditsBought = parseInt(userData?.creditsBought, 10) || 0
    const creditsUsed = parseInt(userData?.creditsUsed, 10) || 0
    const hasCredits = creditsBought > creditsUsed + 200
    let key = openaikey || jwt
    key = key?.includes('replaced') ? false : key // invalid if key includes 'This gets replaced'
    if (key) {
      options.headers = { ...options.headers, Authorization: `Bearer ${key}` }
    }
    if (!openaikey && key) {
      useUrl = storageObj.r_endpoint + '/llm'
      jwt && (options.body.jwt = jwt)
    }
    if (!openaikey && !key) {
      console.log('GPT ERROR: Please complete set up:', { storageObj })
      return { error: 'Please complete set up.', userData }
    }
  }

  // Set default options if none provided
  const fetchOptions = {
    method: options?.method || 'GET',
    headers: options?.headers || {},
    body: options?.body || null,
  }
  // Check validity of url and fetch options before fetching. may be undefined

  console.log('1a. SW FETCHING', useUrl, {'method':fetchOptions.method, 'headers': fetchOptions.headers}) //, fetchOptions.body);
  let response = false
  try {
    response = await fetch(useUrl, fetchOptions)
  } catch {}
  const contentType = response.headers.get('Content-Type') || ''
  let content

  if (contentType?.includes('application/json')) {
    content = await response.json()
  } else if (contentType?.includes('application/octet-stream') || contentType?.includes('application/pdf') || contentType?.startsWith('image/')) {
    const arrayBuffer = await response.arrayBuffer()
    content = Array.from(new Uint8Array(arrayBuffer))
  } else {
    content = await response.text()
  }

  // console.log('1b. SW FETCHED:', { response, contentType, contentLength: content.length, content }) 

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    contentType,
    content,
  }
}

chrome?.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
  if (req.action === 'processImage') {
    processImageRequest(req.screenshot, req.prompt, sendResponse)
    return true
  }
})

// Helper function to convert data URL to Blob
function dataURLToBlob(dataUrl) {
  let arr = dataUrl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new Blob([u8arr], { type: mime })
}

function processImageRequest(screenshot, prompt, sendResponse) {
  // Construct the payload
  const payload = {
    image_type: 'base64',
    prompt: prompt,
    image_data: screenshot, // Assuming screenshot is already in base64 format
  }

  // Send the payload to the server
  fetch('http://localhost:5000/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((result) => {
      console.log('Fetch result:', result)
      if (result.result) {
        sendResponse({ result: result.result })
      } else if (result.error) {
        sendResponse({ error: result.error })
      } else {
        sendResponse({ error: 'Unexpected response format' })
      }
    })
    .catch((error) => {
      console.error('Fetch error:', error.message)
      sendResponse({ error: error.message })
    })

  return true // Indicates async response
}
