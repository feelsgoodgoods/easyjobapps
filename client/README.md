# Easy Job Apps - Chrome Extension and Website

https://easyjobapps.com is the main website which has most all features as the chrome extension except for that which requires a /client/components/content script (for the process of obtaining a job description and autofilling job forms). The shared features are the ability to upload resume and cover letters, add your personal bio, and configure settings. Regardless of using the app from a website or chrome extension, the /client/components/app and /server have a /shared folder so all core functions can work on either end. This means no signup required, whereby data is only stored in the browser and the user must provide an open ai api key rather than through purchase of credits. To make this all possible, a unique build process and data handling has been established. 

The critical components of the app are as follows:

- client/components/App_Index.js - The entry point for a sidepanel chrome extension. works as a webpage as well.

- client/components/content.js - The entry point for the chrome extensions content script. Logic terminates early if used as a website and not as a chrome extension.

- client/components/app/content_popup.js - A dedicated sidepanel script to interact with the client/components/content.js, used for the chrome extension only.

- client/components/service-worker.js - Handles Chrome storage for both App and Content scripts and passes requests between them. 

- dist/ - Where webpack compiled assets are stored, used by extension manifest.

## Chrome extension manifest.json
The chrome extension gets served as you would expect. 

Notes: 
- The sidepanel serves a webpacked version of our app.

- **side_panel**: `dist/index.html` The Webpacked asset version of client/components/App_Index.js.  
- **Permissions**: `sidePanel`, `activeTab`, `scripting`, `clipboardWrite`, `tabs`, `storage`, `contextMenus`.
- **Content Scripts**:  `content_getForms.js`, `content_fillForms.js`, `content.js`, `content_linkedin_utils.js`, `content_linkedin.js`, `html2canvas.min.js`.
- **Background Service Worker**: `client/components/service-worker.js`  

## In Dev 
The app is visited from the server port 3002 and DefinePlugin process.env.WEBPACK_ENV == 'development'

## Webpack Configuration

The webpack configuration is designed to support both the Chrome extension and web application builds. It supports both development and production modes with appropriate optimizations for each environment.
 
- **Entry Point**: `./client/components/App_Index.js` 
- **CopyWebpackPlugin**: Copies `PDF.js` and `content_popup.js` to dist
- **HtmlWebpackPlugin**: Generates the index.html w/ a React id=root div and content_popup.js which will terminate early for web envs.
- **DefinePlugin**: Sets `process.env.WEBPACK_ENV` = mode (i.e. development or production)
- **IgnorePlugin**: Prevents server-specific modules from being bundled

### Development Server
- Port 3001 with hot reloading watches /client
- Proxies API requests to the backend server (port 3002)
- Writes assets to disk for Chrome extension development  

## package.json 

### Build Commands
- **dev**: Runs `start` (devserver) and `servers` (apibackend)
- **staging**: Runs `start`, `servers`, and `watchbuild` (extension+website): staging.easyjobapps.com
- **prod**: Copies `/*` to to `/../easyjobapps`, autoupdating a PM2 script. (website) easyjobapps.com

### For the client
- **start**: Runs webpack in development mode, boots dev server . No api server.
- **watchbuild**: Uses `nodemon_build.json` to `run build` on client file changes.
- **build**: Runs webpack in production mode, generates source maps, and runs output.js which Copies `manifest.json` assets post-webpack to /output 

### For the server
- **watchserver**: Boots API Server via `nodemon_server.json`, reloading `index.js` wherever and whenever a file a changes w/ a 2.5s delay.
- **stripe** - Hooks stripe notifications into Api Server.
- **latex** - Boots local server (note: prod uses a `pm2` `docker`)
- **servers**: Runs `watchserver`, `stripe`, `latex`

**Note**: `process.env.WEBPACK_ENV` is used to determine which latex endpoint to use at runtime, either the local version, or the production version. The local version is only needed in dev while staging and prod should use the pm2 docker version.  

## Development Tips:

- Extension SW Dev Console: chrome://inspect/#service-workers
- Non Content based functionality should be written using the web version
- Use `Advanced Extension Reloader` to force the content script to reload on refresh. 
- - Explanation: The chrome extension serves from dist meaning webpack dev server updates the sidepanel on refresh, but the context will then be invalidated and the new service worker wont be able to communicate with the un-refreshed browser. A button has been put in place to manually refresh (could be automated w logic, i believe, maybe?), but alternately, a chrome extension already exists at the press of a button. 

## App - Service worker - Content Script Interaction 

On load, `index.html` calls client/components/app/`content_popup.js`  which checks if it is in a chrome extension and if so, attaches handler functions to the window to interact with the service worker ( to be called from react components ) and message listeners to pass data back to components using functions defined into the window set by those react components. When the service worker recieves a request from the app via `content_popup.js`, it will be either to retrieve data from browser storage, or to interact with `client/components/content.js` to either retrieve a job description, or fill out a job form (depending on user action). Async message passing is unreliable between app, service worker, and content script, so the code was written without the expectation of callbacks whatsoever when interacting with the content script.

### Walkthrough example 

- /client/components/app/`App_Index.js`: 
```
import { r_endpoint, p_endpoint } from '../../../shared/endpoints.js'

const handleGenerateDocument = async () => {
    const resp_text = await route(body, `/refine_yaml`)
    ...
    let base64EncodedData = await generatePdf(text) 
}
async function generate_pdf(body) {
    const url = p_endpoint() // Pandoc URL
    const response = await fetch(url, {body:text,latex} )
}

{!isQa && !isSettings && <ApplyEditor  
    userData={userData} setUserData={setUserData}   
    activeTab={activeTab} showToast={showToast} 
    handleGenerateDocument={handleGenerateDocument} />
}
```

- /client/components/app/apply/`App_Apply_Upload_Post.js`: 
```
  useEffect(() => {
    window.handleAutoApplyResponse = handleAutoApplyResponse;  
    window.handleAutoLoadJobResponse = handleAutoLoadJobResponse; 
  }, []);
  
  async function handleApplyButton(){ 
    let response = await window.passToContent?.("apply", {postData, userData}); 
  } 
  async function handleAutoLoadButton(){
    let response = await window.passToContent?.("getPost", false);
  }
 
  async function handleAutoApplyResponse (fromContent) { 
    console.log('handleAutoLod fromContent?', {fromContent}); 
    const type = fromContent.type;
    const text = fromContent.text;
    const base64EncodedData = fromContent.base64EncodedData;
    const newPostData = {
      ...fromContent.postData,
      [type + 'Text']: text, 
      [type + '64']: base64EncodedData
    }; 
    if (text && newPostData) { ... }
  }; 

  async function handleAutoLoadJobResponse() { ... }
```

- /client/components/app/`content_popup.js`:
```
async function setChromeStorage(key, val) { }
async function getChromeStorage(key) { }
window.passToContent = async (action, options) => {
  chrome.tabs.sendMessage(tab.id, { toContentAction: action, data: options })
}
chrome?.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
  handleMessage(req) 
}) 
async function handleMessage(req) { 
  let data = req.data;
  let action = req.toAppAction // Only responds to App Actions
  if (!action){ return; } 
  if (action === 'reloadSidePanel') { window?.reloadApp?.() } // Browser => Content => App 
  else if (action === 'handleAutoLoad') { //{ base64EncodedData, postData, text, type }
    window?.handleTabClick('apply')  
    data?.newPostData?.needsCleaning && (data.newPostData.needsCleaning = data?.needsCleaning)
    result = await window?.handleAutoLoadJobResponse(data.newPostData)  
    window?.passToContent('postDataUpdated', { postData: result }) 
  }
  else if (action === 'handleAutoApply') { window?.handleAutoApplyResponse(req.data) } 
  else if (action === 'qareply') { window?.handleTabClick('apply') }  
}

```

- /client/components/`service-worker.js`:
```
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => { handleMessage(req) })
async function loadUserData() {}
const fetchData = async (req) => {} 
async function handleMessage(req, sendResponse) {  
  let data = req.data;
  let action = req.toSwAction // Only responds to SW Actions
  if (!action){ return; }  
  if (action == 'fetchData') { await fetchData(req)   }  
  else if (action == 'updatesw') { 
    update(req.key, req.value) // content-popup.updateSW
  } 
} 
```

- /client/components/`content.js`
```
// Sidebar Handler
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Content: ONMESSAGE', request)
  let action = request?.toContentAction 
  if (!action) return  
  data = action === 'getPost' ? await getPost() :
    action === 'postDataUpdated' ? {'updated':'postData'} :
    action === 'apply' ? await apply() : // { userData, postData}  
    action === 'askQuestion' ? await askQuestion(request) :  
    action === 'jobResult' ? await handleFinalResult(message.result) : // molmo
    { error: `Invalid action ${action}` }
  
} )

async function apply(req = false) {
    window.jobPost = postText ? {text : postText} : await window.getPost() 
    let formFields = await window.getForms()
    let fillFormsOptions = await processForm(formFields) 
    await window.fillForms({ fillFormsOptions: JSON.stringify(fillFormsOptions) }) 
}

async function callChatGPT(post, type = 'gpt-4.1-mini', max_tokens = 4096, tools = false, chat = false) {}

window.fetchResource = async function fetchResource(url, options = {}, timeout = 450000) {
  // console.log(':fetchResource:', { url, options })  
  let response = false
  try { 
    response = await chrome.runtime.sendMessage({ toSwAction:'fetchData',url, options }) 
  }
}



```
 

- /client/components/content/`content_getForms.js`
```
window.getForms = async function () { }

async function getPost() { sendIt(returnThis, false) }

window.sendIt = async (newPostData, needsCleaning = true) => {     
  newPostData = { ...newPostData }  
  chrome.runtime.sendMessage({ toAppAction: 'handleAutoLoad', data : {newPostData, needsCleaning} });  
  window.postDataUpdated = true  
} 
```

- /client/components/content/`content_fillForms.js`
The part of the content script that generates the resume content and sends data back to the service worker
``` 
async function processForm(formData) {
    const message = await callChatGPT(prompt)
    generatedResume = generateResume()  
}
window.fillForms = async function fillForms(request) {
    fillFormsOptions.map(async (formField) => fillField(formField) )
}
let fillField = async (formField) => {
      let base64data = fileName.includes('Resume')  && await generatedResume
      if (base64data) {
        await uploadFile(el, base64data) // Wait for uploadFile to complete
      }
}
 
async function generateResume (){
  const resp_text = await refin_yaml(givenText) 
  const template = await getTemplate(resEditor)
  sendGenerated()
}
let sendGenerated = async (type, text, base64EncodedData) => {   
    response = await chrome.runtime.sendMessage({ 
        toAppAction: 'handleAutoApply', 
        data : { postData, type, text, base64EncodedData} 
    }); 
}
 
``` 


**Notes**

- /home/carlos/Documents/GitHub/easyjobapps/client/components/app/apply/`App_Apply_Create.js`: Recieves `handleGenerateDocument` and creates a button which is available on the web version without content script. The content script has its own document generation functions as a result of the unreliable async functionality when passing messages and makes service-worker for API Calls. In the future the generateResume logic needs to be exported into its own handler because there is a discrepency how the content version and the sidepanel version work.
 
### Resume/ Cover Letter Generation:

Most importantly, you can see how:

content_fillForms.js - content script that generates the resume content and sends data back to the service worker
 
response = await chrome.runtime.sendMessage({ 
    toAppAction: 'handleAutoApply', 
    data : { postData, type, text, base64EncodedData} 
}); 
