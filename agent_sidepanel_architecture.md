# Agent reference: side-panel architecture and development

This is an agent-oriented working reference for Easy Job Apps. Verify the implementation before relying on line numbers or volatile behavior. Current source and configuration remain authoritative.

## The three execution environments

### 1. Content scripts: page inspection and interaction

The content scripts listed in `manifest.json` run inside matched job pages at `document_idle`. Their advantage is access to the page DOM.

They own:

- scraping job descriptions and application forms
- LinkedIn, Greenhouse, Ashby, Workable, and generic-page handling
- filling text, select, radio, checkbox, and file inputs
- uploading generated documents into page forms
- transient per-tab globals such as `window.userData` and `window.postData`
- status overlays shown inside the job page

Principal files:

- `client/components/content.js`
- `client/components/content/content_getForms.js`
- `client/components/content/content_fillForms.js`
- `client/components/content/content_linkedin.js`
- `client/components/content/content_linkedin_utils.js`

Do not move DOM scraping into the service worker or side panel: those contexts cannot directly inspect the active page DOM.

### 2. MV3 service worker: privileged extension operations

`client/components/service-worker.js` runs outside website origins and may be suspended and restarted by Chrome.

It owns:

- context menus
- opening the side panel
- extension-level message handling
- privileged cross-origin fetches covered by host permissions
- loading `chrome.storage.local.userData` when preparing privileged requests
- serializing JSON, text, and binary fetch responses for content scripts

The worker is not currently the central broker for every storage operation. The side panel and content script also access `chrome.storage.local` directly. Treat worker globals as disposable; required state must be reloaded from durable storage after an MV3 restart.

### 3. Index/side-panel page: React interface

The extension side panel points to `dist/index.html`. Webpack creates that page from `client/components/App_Index.js` and emits `dist/popup.js`.

The same React application also runs as the hosted web app. In extension mode it gains access to Chrome extension APIs; in ordinary web mode storage can fall back to page `localStorage` and tab-specific actions are unavailable.

The panel owns:

- the visible React interface
- user and job state presented to the user
- initiating Load Job and Apply operations
- normalizing or saving scraped job data
- persisting `userData` and `postData`
- displaying generated resumes, cover letters, and responses

`client/components/app/content_popup.js` is the bridge between the React page and Chrome APIs. Webpack copies it into `dist/`, and generated `dist/index.html` loads it before the deferred React bundle.

## Message families

The extension uses one-shot messages, not long-lived ports or a shared schema.

### `toContentAction`

Transport: `chrome.tabs.sendMessage(tabId, ...)`.

Senders: side panel or service worker.

Receiver: content script in a specific tab.

Current actions include:

- `getPost`
- `apply`
- `postDataUpdated`
- `askQuestion`
- `jobResult`

The service worker also sends `qareply`, but the main content dispatch table currently has no matching branch.

### `toAppAction`

Transport: `chrome.runtime.sendMessage(...)`.

Sender: content script.

Receiver: side-panel bridge.

Current actions include:

- `handleAutoLoad`
- `handleAutoApply`
- `reloadSidePanel`

The bridge invokes React handlers published on `window`, including `handleAutoLoadJobResponse`, `handleAutoApplyResponse`, `reloadApp`, and `handleTabClick`.

### `toSwAction`

Transport: `chrome.runtime.sendMessage(...)`.

Senders: content script or side-panel bridge.

Receiver: service worker.

Current actions include:

- `fetchData`
- `openSidepanel`
- `updatesw`

## Load Job journey

1. The user clicks Load Job in `App_Apply_Upload_Post.js`.
2. `content_popup.js` queries the active tab and sends `toContentAction: "getPost"`.
3. `content.js` checks user context and calls the page-specific or generic scraper.
4. `content_getForms.js` scrapes the page and broadcasts `toAppAction: "handleAutoLoad"`.
5. `content_popup.js` passes the result to `window.handleAutoLoadJobResponse`.
6. React processes the data through `/extension_post_create`, updates `postData`, and persists it through the storage bridge.
7. The panel sends `postDataUpdated` back to the active content script.

The Load Job button does not primarily consume the direct `getPost` response. It relies on the separate `handleAutoLoad` broadcast, so this is a request plus a side-channel event.

## Apply journey

1. The user clicks Apply in the side panel.
2. The panel sends `toContentAction: "apply"` with current `postData` and `userData`.
3. The content script inspects the form and fills it using page-specific or generic logic.
4. Cross-origin requests are sent to the service worker as `toSwAction: "fetchData"`.
5. The worker loads extension user data as needed, performs the privileged fetch, and returns a serialized response.
6. Generated resume or cover-letter data is sent back to the panel as `toAppAction: "handleAutoApply"`.
7. React updates the visible document/application state.

## State boundaries

- React state: current interface and document/job state.
- `chrome.storage.local`: shared durable extension data such as `userData` and `postData`.
- Side-panel `localStorage`: extension-origin UI and guest data.
- Content-script globals: transient state scoped to an injected tab.
- Content-script `localStorage`: belongs to the visited website origin, not the extension; avoid putting sensitive durable application data there.
- Worker globals: ephemeral and unsafe as the sole source of required state.

## Development without a production build

### Root extension reload loop

Load `/home/carlos/Documents/GitHub/easyjobapps` once from `chrome://extensions` with Developer Mode enabled, then run:

`npm run start`

This runs the existing Webpack Dev Server on port 3001, watches `client/**/*`, and writes rebuilt React assets to `dist/`. The root manifest continues to load the raw service worker and content scripts directly.

The service worker connects to Webpack's existing `/ws` endpoint. On a new successful build hash or a watched static-file change, it:

1. stores the build hash to prevent a reload loop;
2. refreshes the active tab so content scripts are reinjected;
3. calls `chrome.runtime.reload()` to reload the root extension and worker.

The first installation of this watcher logic may require one manual extension reload because the previously loaded worker cannot execute code it has not loaded. Subsequent rebuilds reload automatically. No separate unpacked-extension directory or `npm run build` is required.

### Backend/API work

Run in a second terminal:

`npm run watchserver`

This uses `nodemon_server.json` to restart `node index.js`, normally on port 3002 for local development.

### Full local stack

Run:

`npm run dev`

This combines the Webpack watcher with the configured backend, Stripe, and PDF/LaTeX services. Use it when those supporting services are needed and available.

### Raw content-script or service-worker work

These files are loaded directly by `manifest.json`, not bundled as Webpack entries. Changes under `client/**/*` still trigger Webpack's watched static-file signal; the worker then refreshes the active tab and root extension.

Keep the content scripts in their current manifest order because several scripts communicate through shared globals in the content-script world.

### Command to avoid

Do not use `npm run staging` as the normal extension-development loop. It starts a development Webpack compiler and repeated production builds that both clean/write `dist/`; the production build also recreates `output/`. Those writers can race.

## Automatic reloading workflow

The automatic loop uses the existing `npm run start` Webpack socket and the raw MV3 service worker. It does not use `webpack-ext-reloader`, an alternate manifest, or a second output tree.

## Known hazards to check before changing adjacent code

- Generic scraping removes elements from the live page instead of scraping a clone.
- The content-script storage setter writes a literal `val` key, and its getter returns `userData` regardless of the requested key.
- Production endpoint selection can derive a `chrome-extension://` origin instead of the backend API origin.
- A failed worker fetch can be followed by access to `response.headers` when no response exists.
- Opening the side panel and immediately scraping can deliver `handleAutoLoad` before React publishes its handler.
- The worker’s broad runtime listener can overlap with messages intended for the panel.
- Operations lack request IDs and stable tab correlation, so switching tabs during asynchronous work can misroute follow-up messages.
- The worker’s `qareply` context-menu action has no matching content-script dispatch branch.
- The page-to-content `window.postMessage` bridge does not validate source, origin, action, or target URL.
- Side-panel state listeners registered only inside `runtime.onInstalled` are not restored on an ordinary worker restart.

Distinguish deterministic code defects from runtime risks. Exercise a journey before claiming a race or endpoint issue was observed live.

## Build and package distinction

- Repository root: raw extension sources plus generated `dist/`; suitable for the current unpacked development arrangement.
- `dist/`: generated React/index assets.
- `output/`: production package assembled by `npm run build` and `output.js`.

Do not assume edits to root sources have reached `output/`, and do not assume either directory is what Chrome currently has loaded without checking Chrome’s unpacked-extension path.
