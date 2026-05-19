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

![Chrome Extension](./img/6.jpg "Chrome Extension")

![Settings Overview](./img/1.jpg "Settings Overview")

![Settings Overview](./img/2.jpg "Settings Overview")

![Settings Overview](./img/3.jpg "Settings Overview")

![Settings Overview](./img/4.jpg "Settings Overview")

![Settings Overview](./img/5.jpg "Settings Overview")

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

goto autoapply

Dev:
    npm run watch dev 
    npm run watch devs
    npm watchbuild      # Packages dist for use in Staging & Manifest

Prod:
    npm run push       # cp repo to ../easyjobapps

services/pm2/ecosystem.config.js
    EasyJobApps = watch: ['./'], env: { NODE_ENV: 'production', PORT: 3003 }
    Autoapply = watch: ['./'], env: { NODE_ENV: 'staging', PORT: 3002 }


ls ./venv -la
chmod +x venv.sh
eactivate
pip install -r requirements.txt
