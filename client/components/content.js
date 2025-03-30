// content.js  

// Todo: 0.5 
// send base64Encoded within postData if available instead of using editorData.resume.text 

// TODO: 1 
// - Save userData.resumes[resumeId].yamlrequirements res.isnewcustometemplate or onsaveorcreate
// - use yamlrequrirements instead of template in generations. 
// - <EditResume> - Chatbot + Suggestions 

console.log('content.js: Loaded.')
console.log('window.refine_yaml:', window.refine_yaml)

window.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

window.molmo = false
window.errMsg = false 

window.jobPost = {}
window.userData = false 
window.postData = false
window.linkedInMenuCreated = false
window.linkedInMenuVisible = false
window.postDataUpdated = false
window.applySettings = false // From userData
window.editorData = false // From userData

window.devSettings = {
  resume: true,
  coverletter: true,
  message: true,
  submit: true,
  submitDelay: false,
  localPandoc: false,
  localServer: true,
}
// Capture the element that was right-clicked
document.addEventListener("contextmenu", (event) => {
  window.clickedElement = event.target;
}); 

// Sidebar Handler
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Content: ONMESSAGE', request)
  let action = request?.toContentAction 
  if (!action) return 

  let validUser = await checkUser(request)
  if (!validUser) { return false } 

  // check if window.userData is set and if not skip out w an alert msg.
  if (!window.userData) { 
    alert('Please login to Easy Job Apps to use this feature.')
    return
  } 

  // Existing logic for non-LinkedIn pages
  data = action === 'getPost' ? await getPost() :
    action === 'postDataUpdated' ? {'updated':'postData'} :
    action === 'apply' ? await apply() : // { userData, postData}  
    action === 'askQuestion' ? await askQuestion(request) :  
    action === 'jobResult' ? await handleFinalResult(message.result) : // molmo
    { error: `Invalid action ${action}` }

  // console.log('content.js sending message:', { action, ...data })
  sendResponse({ action, ...data });
  return true
})

async function setChromeStorage(key, val) {
  console.log('Settting Chrome Storage:', val)
  let exists = chrome?.storage?.local
  exists &&
    (await new Promise((resolve) => {
      chrome.storage.local.set({ val }, () => {
        console.log('SetChromeStorage:', val)
        window.updateSW('setChromeStorage', key, val)
        resolve()
      })
    }))
  if (!exists) { 
    localStorage.setItem(key, JSON.stringify(val))
  }
}
async function getChromeStorage(key) {
  let exists = chrome?.storage?.local
  if (exists) {
    let result = await new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        // console.log('GetChromeStorage:', key, result)
        resolve(result.userData)
      })
    })
    return result
  }
  if (!exists) { 
    let lsVal = localStorage.getItem(key) 
    return !lsVal ? null : JSON.parse(lsVal)
  }
} 

async function apply(req = false) {
  // console.log('Apply2:')  
  
  // LinkedIn gets handled separatelys
  let data = await window?.linkedInAutoApply()
  if (data.success) { return data }

  window.toggleStatusNotification(true, 'Gathering Data');

  // Default Handler    
  const postText = window.postData?.text
  window.jobPost = postText ? {text : postText} : await window.getPost() 
  if(!jobPost){
    window.toggleStatusNotification(true, 'ERROR.');
    return
  }
  if(jobPost.error) {
    window.toggleStatusNotification(true, `Please apply through <a target="_blank" rel="noreferrer" href='${getPostResp.message}'>this link<a>.`);
    console.log('Apply3: Error:', jobPost)
    await delay(5000)
    return
  }
  let formFields = await window.getForms()
  if (formFields.error) { 
    window.toggleStatusNotification(true, `Please Visit ${formFields.message} to Easy Apply`);
    return formFields 
  }

  let fillFormsOptions = await processForm(formFields);

  window.toggleStatusNotification(true, 'Filling Forms'); 
  await window.fillForms({ fillFormsOptions: JSON.stringify(fillFormsOptions) }) 

  function isResolvedOrNull(value) {
    if (value === null) return true;
    if (typeof value === 'object' && value !== null && typeof value.then === 'function') {
        let isResolved = false;
        value.then(() => isResolved = true, () => isResolved = true);
        return isResolved;
    }
    return true;
  }

  let isNull = (value) => value === null
  let isAPromise = (value) => typeof value === 'object' && value !== null && typeof value.then === 'function'
  let isResolved = (value) => isAPromise(value) ? isResolvedOrNull(value) : true
  // if generatedResume isNull toggleoff, if a promise, wait for resolve, if resolved, toggle off.
  let toggleOff = (value) => isNull(value) 
    ? window.toggleStatusNotification(false) 
    : isAPromise(value) ? 
      isResolved(value) ? 
        window.toggleStatusNotification(false) : 
        value.then(() => window.toggleStatusNotification(false)) : window.toggleStatusNotification(false)
  toggleOff(window.generatedResume)

  window.toggleStatusNotification(false); 


}
 
window.addEventListener('message', function (event) {
  event?.data?.type === 'FROM_PAGE' && window.fetchResource(event.data.text, {}, 30000)
})

// Is User Valid 
async function checkUser(req=false){ 

  // POST DATA
  
  window.postData = false 
  let postdata = req?.data?.postData  
  if(!postdata){
    postdata = await getChromeStorage('postData') 
  }
  if(postdata && postdata?.id){  
    console.log('Setting:', {postdata})
    window.postData = postdata 
    window.postDataUpdated = false
  } 
  else{
    // console.log('PostData NOT set')
  }

  // USER DATA

  let userdata = req?.data?.userData 
  if(!userdata){
    userdata = await getChromeStorage('userData') 
    if (!userdata) { 
      window.toggleStatusNotification(true, `Please create complete your profile.`);
      return false
    }
  }
  if(userdata){   
    console.log('Setting:', {userdata})
    window.userData = userdata; 
  } 
  else{
    // console.log('UserData NOT set')
  } 
  let settings = userData?.applySettings 
  if (settings) {  
      window.applySettings = settings
  } 

  let editor = window?.userData?.editorData 
  if (editor) {  
      window.editorData = editor
  } 
  // UserData is empty, no API key or JWT
  if(!userdata?.openaikey && !userdata?.jwt){ 
    window.toggleStatusNotification(true, `Please complete your profile to use this feature.`);
    return false
  }
  return true
} 

// Utils

// Synthetic fetch requests sends to service worker which can bypass cors
async function fetchResource(url, options = {}, timeout = 450000) {
  // console.log(':fetchResource:', { url, options })  
  let response = false
  try { 
    response = await chrome.runtime.sendMessage({ toSwAction:'fetchData',url, options }) 
  
    if (!response) {
      let error = 'No response received from background script';
      console.log(':fetchResource:ERROR:2', {url, error});
      throw new Error(error);
    }
    if (response.error) {
      console.log(':fetchResource:ERROR:3', {url, response});
      throw new Error(response.error);
    }
  } catch (error) {
    console.log(':fetchResource:ERROR:', {url, error:error.message});
    throw error;
  }
  const contentType = response.contentType
  if (contentType?.includes('application/json')) {
    response.json = () => Promise.resolve(response.content)
  } else if (contentType?.includes('application/octet-stream') || contentType?.includes('application/pdf') || contentType?.startsWith('image/')) {
    const arrayBuffer = new Uint8Array(response.content).buffer
    response.blob = () => Promise.resolve(new Blob([arrayBuffer], { type: contentType }))
    response.arrayBuffer = () => Promise.resolve(arrayBuffer)
  } else {
    response.text = () => Promise.resolve(response.content)
  }
  return response
}

window.fetchResource = fetchResource

async function callChatGPT(post, type = 'gpt-4o-mini', max_tokens = 4096, tools = false, chat = false) {
  try {
    let headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${'This gets replaced in the service worker'}` }
    if (!Array.isArray(post)) {
      post = [{ role: 'user', content: post }]
    }
    let data = {
      model: type,
      messages: post,
      temperature: 0, // 0-2 randomness
      max_tokens: max_tokens, // Uses @max 2000 of available tokens for response.
      top_p: 0.1, // 0-1 nucleus sampling
      frequency_penalty: 0, // 0-2 decreases word repetition
      presence_penalty: 0, // 0-2 increases topic diversity. bad for json
      ...(chat ? {} : tools ? { tool_choice: 'auto', tools: tools } : { response_format: { type: 'json_object' } }),
    }
    let url = 'https://api.openai.com/v1/chat/completions'
    const response = await fetchResource(url, { method: 'POST', headers, body: JSON.stringify(data) })
    let chatGPTResponse
    if (response.error) {
      console.log(':callChatGPT:ERROR:11', responseData.error, { data })
      return { error: response.error, }
    }
    const responseData = await response.json()
    // console.log(':callChatGPT:responseData:', {responseData})
    if (responseData.error) {
      console.log(':callChatGPT:ERROR:2', responseData.error, { data })
      return false
    }
    if (tools) {
      chatGPTResponse = responseData.choices[0].message.tool_calls[0]
    } else {
      chatGPTResponse = responseData?.choices?.[0]?.message?.content || responseData
    }
    return chatGPTResponse
  } catch (error) {
  }
}
window.callChatGpt = callChatGPT

// Create UI Elements
const buttonStyle = `padding: 10px; background: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 3px; font-weight: bold;`
const inputStyle = `padding: 5px; margin-bottom: 10px; width: 200px;`
const containerStyle = `position: fixed; bottom: 10px; left: 10px; z-index: 100000; background: rgba(0, 0, 0, 0.8); padding: 15px; border-radius: 5px; display: flex; flex-direction: column; gap: 10px;`

let container = document.createElement('div')
container.style = containerStyle
container.id = 'easyjobapps-container'

// Create On-Page Button
let button = document.createElement('button')
button.id = 'easyjobapps-button'
button.innerHTML = 'Easy Job Apps'
button.style = buttonStyle
button.addEventListener('click', async () => {
  console.log('Button Clicked')
  // Send a message to the background script to open the sidepanel
  chrome.runtime.sendMessage({ toSwAction: 'openSidepanel' }) 
  // let validUser = await checkUser()
  // if (!validUser) { return false }
  // // Check conditions where we want to collapse the handler
  // if (window.linkedInMenuVisible) {
  //   let linkedInContainer = document.getElementById('easyjobapps-linkedin-container')
  //   linkedInContainer.style.display = 'none'
  //   window.linkedInMenuVisible = false
  //   let easyJobAppsButton = document.getElementById('easyjobapps-button')
  //   easyJobAppsButton.innerHTML = 'Easy Job Apps'
  //   return
  // }
  // await apply()
})

container.appendChild(button)

if (
  ['apply.workable.com', 'job-boards.greenhouse.io', 'boards.greenhouse.io', 'jobs.ashbyhq.com'].includes(window.location.hostname) ||  
  [ 'https://www.linkedin.com/jobs/view/', 'https://www.linkedin.com/jobs/collections/', 'https://www.linkedin.com/jobs/search/' ].some(url => window.location.href.startsWith(url))
) {
  document.body.appendChild(container)
}
 



function toggleStatusNotification(show, text = 'Running...') {
  const id = 'status-toast';
  const outerId = `${id}-outer`;
  let outerEl = document.getElementById(outerId);

  if (show) {
    if (!outerEl) {
      outerEl = createStatusNotification(id, outerId, text);
    } else {
      // Update content of the inner div if it already exists
      const innerEl = outerEl.querySelector(`#${id}`);
      if (innerEl) {
        innerEl.innerHTML = innerContent(text);
      }
    }
  } else {
    // Remove the notification
    outerEl?.remove();
  }
}
let innerContent = (text) => { return `
    <div class="spinner" style="width:16px;height:16px;border:3px solid #eee;border-top:3px solid #2563eb;border-radius:50%;margin-right:12px;animation: spin 1s linear infinite;">
    </div><div style='
      display:flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    '><b>EASY JOB APPS</b><i>${text.toUpperCase()}</i></div>`;
}
function createStatusNotification(id, outerId, text) {
  // Create outer div
  const outerEl = document.createElement('div');
  outerEl.id = outerId;
  outerEl.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 15px;
    background: black;
    border-radius: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: glow 2s ease-in-out infinite;
    box-shadow: 0 0 10px 4px rgba(255, 255, 255, 0.6); /* Initial value */
  `;

  // Create inner div
  const innerEl = document.createElement('div');
  innerEl.id = id;
  innerEl.style.cssText = `
    background: #4CAF50;
    color: white;
    padding: 10px;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    font-weight: bold;
    display: flex;
    align-items: center;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  `;
  innerEl.innerHTML = innerContent(text);

  // Append inner to outer
  outerEl.appendChild(innerEl);
  document.body.appendChild(outerEl);

  // Append styles for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { background: #4CAF50; } 50% { background: #66bb6a; } }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 10px 4px rgba(102, 187, 106, 0.6); } 50% { box-shadow: 0 0 20px 8px rgba(102, 187, 106, 0.8); } }
  `;
  document.head.appendChild(style);

  return outerEl;
} 

// LATER OR MISC 

// content popup listener on redirect to show/hide button

// ??? Docs created in Browser&Sidepanel - postData too.. assess if needed?
// ??? Remove JobInfo use PostData.meta instead 
// TODO - Transcript and Profile Photo
// TODO - Promo Code.
// TODO - Send my resume to recruiters?
// TODO - Check if IFRAME and send message to parent window.
// TODO - buycredits. earn credits. ads in iframe while autoapplying
// TODO - storedFields = JSON.parse(localStorage.getItem('historicalQs12') || '[]');
// TODO - addOrUpdateCompanyAndPostData doesnt update if post exist. matches using posttext and not postid or jobtitle. 
// TODO: SW handles Route() - Webpack & use IndexDB not LS - atm !loggedIn ? table.js db requires sidepanel to be open. 

// todo: ? window?.postData?.text determine if should be identical to jobPost / appLinkedInfo
// todo: ?  IS this needed ? window?.postData?.resumeText || resObj.text

// console.log('content.js: Loaded.') 
// chrome.runtime.reload(); 

// todo:: copy let useExpanded = templateName == 'Expanded' to apply_index 


// Todo: postData.meta (from DB) but not userData.editorData, set userData.editorData to postData.meta ? 
// - only save the id & tailor text. 

// Todo: handleLogout:fetchUserData should be outside of ifelse but for now...