# Dual-use Web and Chrome Side-panel Architecture

Easy Job Apps has two public entry surfaces and one shared React app surface:

- `/` is the public splash page served by `index.js` from `static/welcome.html`.
- `/popup.html` is the hosted React app page served by `index.js` from `dist/index.html`.
- The Chrome extension side panel points to the same `dist/index.html` through `manifest.json` at `side_panel.default_path`.

That means the side panel is not a separate app. It is the same webpacked React page, with Chrome APIs available when it runs under the extension origin.

## Build Output

- `webpack.config.js` has one app entry: `client/components/App_Index.js` -> `dist/popup.js`.
- `HtmlWebpackPlugin` writes `dist/index.html` with `<div id="root"></div>` and a `<script src="content_popup.js"></script>` bridge before the React bundle.
- `CopyWebpackPlugin` copies `client/components/app/content_popup.js` and `pdf.worker.mjs` into `dist/`.
- `npm run build` runs webpack in production mode, then `node output.js`.
- `output.js` copies `manifest.json`, icons, content scripts, the service worker, and the whole `dist/` directory into `output/` for extension packaging.
- In development, `npm run start` runs webpack dev server on port `3001`; `index.js` is the API/static server on port `3002`.
- The root MV3 service worker listens to that existing Webpack socket. A successful build or watched raw-script change refreshes the active tab and reloads the root unpacked extension; there is no alternate development manifest or output tree.

## Runtime Detection

- `client/components/App_Index.js` detects extension mode with `window.origin.startsWith('chrome-extension')`.
- The same file sets `body[data-chrome-extension="true"]` in extension mode so CSS can adapt to the narrow side panel.
- `client/components/app/content_popup.js` checks whether `chrome.storage.local` and `chrome.tabs` exist. When available, storage and active-tab messaging use Chrome APIs. Otherwise storage falls back to `localStorage` and tab messaging returns an extension-required error.
- `shared/endpoints.js` uses `process.env.WEBPACK_ENV`, `process.env.NODE_ENV`, and `window.origin` to decide the API origin. In a production webpack build, the app uses `window.origin`.

## Main Entry Points

- `static/welcome.html`: public splash page for `/`.
- `client/components/App_Index.js`: React app bootstrap for both `/popup.html` and Chrome side panel.
- `client/components/app/App_Apply.js`: main apply/document workflow after bootstrap.
- `client/components/app/apply/App_Apply_Upload_Post.js`: Load Job, manual job upload, Apply button, and extension response handlers.
- `client/components/app/content_popup.js`: side-panel/page bridge loaded by `dist/index.html`.
- `client/components/content.js`: root content script loaded into matched pages.
- `client/components/content/content_getForms.js`: extracts job descriptions and form structures.
- `client/components/content/content_fillForms.js`: generates answers/documents and fills non-LinkedIn forms.
- `client/components/content/content_linkedin.js` and `content_linkedin_utils.js`: LinkedIn Easy Apply flow.
- `client/components/service-worker.js`: Manifest V3 background service worker.
- `index.js`: Express app routes for splash, React app HTML, static assets, `/llm`, and shared API route registration.
- `shared/routes.js`: client/server route table.
- `client/router.js`: browser router deciding local shared handlers vs server API calls.

## Message Routing

The app, content scripts, and service worker use namespaced message fields so each layer ignores messages meant for another layer.

### App to Content Script

`App_Apply_Upload_Post.js` calls `window.passToContent(...)`, which is defined in `content_popup.js`.

`content_popup.js` does:

1. `chrome.tabs.query({ active: true, currentWindow: true })`
2. `chrome.tabs.sendMessage(tab.id, { toContentAction: action, data: options })`

Content-side actions handled by `content.js` include:

- `getPost`: read job context through `content_getForms.js`.
- `apply`: fill supported forms through generic handlers or LinkedIn handlers.
- `postDataUpdated`: acknowledge updated post data.
- `askQuestion` and `jobResult`: auxiliary extension actions.

### Content Script to App

Content scripts send app-directed messages with `toAppAction`.

- `content_getForms.js` calls `chrome.runtime.sendMessage({ toAppAction: 'handleAutoLoad', data: { newPostData, needsCleaning } })`.
- `content_fillForms.js` calls `chrome.runtime.sendMessage({ toAppAction: 'handleAutoApply', data: { postData, type, text, base64EncodedData } })`.

`content_popup.js` listens for those messages and calls React handlers exposed on `window`:

- `window.handleAutoLoadJobResponse(...)`
- `window.handleAutoApplyResponse(...)`
- `window.reloadApp(...)`
- `window.handleTabClick(...)`

Those handlers are registered by `App_Index.js` and `App_Apply_Upload_Post.js`.

### Content Script to Service Worker

`content.js` defines `window.fetchResource(...)`, which sends:

`chrome.runtime.sendMessage({ toSwAction: 'fetchData', url, options })`

The service worker fetches the resource, serializes JSON/text/binary data, and returns it to the content script. This is how content scripts avoid page CORS restrictions for API and document-generation fetches.

### Service Worker to Content Script

`service-worker.js` creates context menu items on install:

- `loadJob`: opens the side panel and sends `toContentAction: 'getPost'`.
- `apply`: sends `toContentAction: 'apply'`.
- `qareply`: sends `toContentAction: 'qareply'`.

The small on-page Easy Job Apps button injected by `content.js` sends `toSwAction: 'openSidepanel'`; the service worker then opens the Chrome side panel for the current window.

## Content-script Responsibilities

The manifest injects these scripts on `<all_urls>` at `document_idle`:

- `content_molmo.js`
- `content_getForms.js`
- `content_fillForms.js`
- `content.js`
- `content_linkedin_utils.js`
- `content_linkedin.js`
- `rsc/html2canvas.min.js`

The scripts only show the floating Easy Job Apps page button on selected hosts and LinkedIn job URLs. Supported extraction/fill paths currently include LinkedIn jobs, Greenhouse, Ashby, Workable, and generic forms found in the page body.

The content layer owns:

- Reading job descriptions from the active page.
- Detecting and serializing form fields.
- Running LinkedIn-specific Easy Apply navigation.
- Filling text, select, radio, checkbox, and file inputs.
- Uploading generated resume and cover-letter PDFs into supported file fields.
- Showing status notifications inside the job page.

## Service-worker Responsibilities

`client/components/service-worker.js` owns extension-level behavior:

- Creating context menu actions on install.
- Setting `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
- Opening the side panel from context menus or content-script button clicks.
- Tracking side-panel open state in `sidePanelState`.
- Loading `chrome.storage.local.userData` for extension fetches.
- Handling `toSwAction: 'fetchData'` as a fetch proxy for content scripts.
- Rewriting OpenAI calls to include the user's OpenAI key when available.
- Attempting to route OpenAI calls through the app server `/llm` when no user key is available but JWT/credits are available.

## Storage and API Boundaries

- React app startup reads `userData` and `postData` through `window.getChromeStorage`, which maps to `chrome.storage.local` in the extension and `localStorage` on the hosted page.
- React state changes write the same records back through `window.setChromeStorage`.
- Guest/no-JWT usage stays mostly in the browser. `client/router.js` calls shared `db` and `gpt` handlers directly; `shared/queryDb.js` uses `client/table.js` in the browser and `server/misc.js` on the server.
- Logged-in/JWT usage goes through the Express API returned by `r_endpoint()`.
- `index.js` registers routes from `shared/routes.js`; most routes require `jwtAuth`, and GPT-backed routes also use `checkUserCredits`.
- `/llm` is a server-side GPT proxy for JWT-authenticated requests.
- PDF generation uses `p_endpoint()`, returning the local Pandoc service in development only when configured and `https://getfrom.net/pandoc` otherwise.

## Important Caveats

- `content_popup.js` is loaded in both web and extension HTML. It expects Chrome-family browser globals to exist when using `chrome?.`; non-Chrome browsers may need a `globalThis.chrome` guard before this page can run cleanly.
- Several content-script-to-app paths are effectively fire-and-forget. The existing code avoids relying heavily on callback responses between content scripts, the service worker, and the side panel.
- `service-worker.js` has an in-memory `storageObj`. Some fallback OpenAI proxy logic expects values such as `storageObj.r_endpoint` and `storageObj.jwt`, so changes to the fetch proxy should verify those values are populated before relying on server-side `/llm`.
- The public splash should describe "supported forms" rather than universal form automation. The content scripts have specific site handlers plus a generic fallback, not a guarantee for every application page.
