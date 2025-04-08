console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ content popup.js ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

console.log('chrome://inspect/#service-workers')

// chrome.runtime.sendMessage({ toAppAction: 'handleAutoLoad', data : {newPostData, needsCleaning, createNew:true} });  
// chrome.runtime.sendMessage({ toAppAction: 'handleAutoLoad', data : {postData, type, text, base64EncodedData} });

async function handleMessage(req) { 
  let data = req.data;
  let action = req.toAppAction
  if (!action){ 
    // console.log('onMessage: No action', req) 
    return;
  }
  console.log('handleMessage recieved:', action, req?.data)
  // console.log('onMessage:', req, action)  

  if (action === 'reloadSidePanel') {
    window?.reloadApp?.() // Browser => Content => App
  } 
  else if (action === 'handleAutoLoad') { //{ base64EncodedData, postData, text, type }
    window?.handleTabClick('apply')  
    data?.newPostData?.needsCleaning && (data.newPostData.needsCleaning = data?.needsCleaning)
    result = await window?.handleAutoLoadJobResponse(data.newPostData)  
    window?.passToContent('postDataUpdated', { postData: result }) 
  }
  else if (action === 'handleAutoApply') { 
    window?.handleAutoApplyResponse(req.data) 
  } 
  else if (action === 'qareply') {
    window?.handleTabClick('apply')
  }  
}

chrome?.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
  // handleMessage(req).then(sendResponse).catch((error) => sendResponse({ error: error.message }))
  handleMessage(req) 
}) 

// {action, fillFormOptions}
// actions=["getPost", "apply"(user,postdata)]
window.passToContent = async (action, options) => {
  if (!chrome?.tabs)  return { type: "extension", error: 'Chrome tabs API not found.' }  
  const [tab] = await chrome?.tabs?.query({ active: true, currentWindow: true }) // Active browser tab on the current window.
  if (!tab) return { type: "refresh", error: 'No active tab found.' }
  const response = await chrome.tabs.sendMessage(tab.id, { toContentAction: action, data: options })
  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError)
  }
  return response
}

window.updateSW = async (key, value) => {
  // console.log('passingToSW:', {key, value}, window.origin);
  // check if started from chrome extension or is localhost or prod
  const flag = window.origin.startsWith('chrome-extension') || window.origin === 'http://localhost:3002' || window.origin === 'https://easyjobapps.com'
  flag &&
    chrome.runtime?.sendMessage({ toSwAction: 'updatesw', key, value }, (response) => {
      // console.log('Message sent to background script:', response)
    })
}

async function getChromeStorage(key) {
  console.log('getChromeStorage: key', key)
  let exists = chrome?.storage?.local;
  if (exists) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key] !== undefined ? result[key] : null);
        }
      });
    });
  } else { 
    let lsVal = localStorage.getItem(key);
    return !lsVal ? null : JSON.parse(lsVal);
  }
}

async function setChromeStorage(key, val) { 
  console.log('setChromeStorage: key, val', key, val)
  let exists = chrome?.storage?.local;
  if (exists) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: val }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  } else { 
    localStorage.setItem(key, JSON.stringify(val));
  }
} 