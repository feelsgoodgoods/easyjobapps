# resumAI

Scan job posts and links, then generate a refined resume and cover letter.

## About

With the app, you can:

- Auto-generate email, resume, and cover letters
- Auto-fill online job forms and auto-upload neccessary documents.


Temporarily Out of Service due to redesign

- Auto-send emails with resume and cover letter
- Individually or bulk process job posts found online.
- Create chatbots on a per company/job basis.
- Grab or create a company's sitemap then use this information to:
- - Extract relevant job/company information from links and embedded videos.
- - Use an LLM-powered web crawler to navigate the web and scan for new jobs.

## Pictures

Reference image: `img/6.jpg` (Chrome Extension)

Reference image: `img/1.jpg` (Settings Overview)

Reference image: `img/2.jpg` (Settings Overview)

Reference image: `img/3.jpg` (Settings Overview)

Reference image: `img/4.jpg` (Settings Overview)

Reference image: `img/5.jpg` (Settings Overview)

`apt-get install texlive`
`sudo apt-get install texlive-latex-extra` - `Y`

chrome://inspect/#service-workers

chrome://serviceworker-internals/?devtools




# NOTES


Stripe - you have two accounts. charles.karpati and charleskarpati. you want to use the charleskarpati one.

When in dev: Forward events to your webhook. from root:

./stripe listen --forward-to localhost:3002/stripe/event

./stripe trigger payment_intent.succeeded

https://dashboard.stripe.com/test/webhooks/create?endpoint_location=local


In dev, Non-Webpacked assets are proxied to the server (index.js)

webpack.DefinePlugin =>

- 'process.env.BROWSER': JSON.stringify(true),
- - For /shared files resources check env.BROWSER
- - To check if /shared/db.js is being used in the browser or server

http://localhost:3002/popup.html?stripe_status=success&sidepanel=false&username=guest_623d03fa&session_id=cs_test_a1u2G12zfBuunE6wyi8qCWQaLjYD6MJRzxBn9zlaewXrQUKVpCzKTxE8oH

http://localhost:3002/popup.html?stripe_status=success&sidepanel=false&username=guest_afecb456&session_id=cs_test_a1PxjdMh8QfXdmufaD42PoAH9gfBVCHWQw0NzrMO2Q4jwwqnEUF8S6n4hc

https://easyjobapps.com/?stripe_status=success&sidepanel=false&username=guest_623d03fa&session_id=cs_test_a1FvsAfSUgsqSrgHpwpsY8ji1MNvg8aNYjaMNjZms1jkTV3OHpcCRqhCfX




Webpack:3001 proxies to index.js:3002

WebpackENV == process.env.node_env || mode
webpack start == development mode.
weback build == production mode.
services/pm/ecosystem.config.js == staging or production


WebPack Dev: 3001
Dev Index.js: 3002
Staging Index.js: 3003

goto easyjobapps-staging

### Chrome extension development

Load `/home/carlos/Documents/GitHub/easyjobapps` from `chrome://extensions` with Developer Mode enabled, then run:

`npm run start`

The existing Webpack server rebuilds the React side panel and signals the root extension's service worker. After a successful build or watched content-script/service-worker change, the worker refreshes the active tab and reloads the extension. No separate unpacked-extension directory or `npm run build` is needed.

Run `npm run watchserver` in a second terminal when local API routes are needed.

Dev:
    npm run watch dev
    npm run watch devs
    npm run watchbuild  # Packages dist for use in Staging & Manifest

Prod:
    npm run prod       # from easyjobapps-staging, safely copies to ../easyjobapps
    npm run test:deploy
    npm run prod -- --production-destination /path/to/production
                      # required for any non-easyjobapps-staging source

services/pm2/ecosystem.config.js
    easyjobapps = watch: ['./'], env: { NODE_ENV: 'production', PORT: 3003 }
    easyjobapps-staging = watch: ['./'], env: { NODE_ENV: 'staging', PORT: 3002 }


ls ./venv -la
chmod +x venv.sh
eactivate
pip install -r requirements.txt

## Legacy private note migration

Migrated from legacy Easy Job Apps project and competitor notes.

### Product and UX backlog

- Revisit auth/login flow and validate local user/profile loading behavior.
- Explore email and Bloomberg sourcing plus Puppeteer-based automation helpers.
- Improve resume/CV flows: resume import, AI-assisted resume creation, template selection, and structured experience/education/skills capture.
- Strengthen autofill, keyword/resume matching, and support for custom resume + cover letter per application.
- Capture richer job preferences such as salary, availability, travel, work rights, and demographic/disclosure fields.

### Market and competitor research

- Track competitors including Ramped AI, ApplyDog, and auto-apply tools.
- Compare pricing, onboarding friction, autofill depth, and CV/cover-letter generation quality.
- Keep an eye on FAQ pain points: LinkedIn restrictions, Easy Apply failures, manual-question fallbacks, and profile completeness requirements.

### Compliance and operations notes

- Document Stripe-facing website requirements: business identity, support contact, refund/dispute/cancellation policy, privacy policy, promotions terms, transaction currency, and card-data security policy.
- Review GDPR/privacy implications for tracking pixels, local storage, and non-essential network beacons.
- Monitor outbound IP reputation/blacklisting during automation-heavy activity.
