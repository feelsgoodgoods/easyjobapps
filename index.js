// index.js

//
// Description:
// - Entrypoint, grabs express app froms middleware file and adds routing logic (app, login, payments).
// - - Middleware uses JSON instead of DB 4 portability.
//
//
// In dev, Requests for Non-Webpacked assets are proxied here.
//
//

import { fileURLToPath } from 'url'
import { dirname } from 'path'
import express from 'express'
import { app, jwtAuth, checkUserCredits } from './server/index_middleware.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename) 
// PORT=4000 node ./index.js from ecosystem.config.js

console.log( process.env.PORT)
const port = process.env.PORT || 3002; // Staging = 2002, Prod = 3003


// Import login and payment routes after initializing middleware
import './server/index_login.js'
import './server/index_payment.js' //

// Other imports for routes, static files
import path from 'path'
import { gpt } from './shared/gpt.js'
import { db } from './shared/db.js'
import { routes } from './shared/routes.js'
import { callChatGPT } from './shared/gpt_call.js'

// serve dist/popup.html as /
app.get('/', (req, res) => {
  console.log('1 - User Visiting welcome', __dirname)
  res.sendFile(path.join(__dirname, 'static', 'welcome.html'))
})

app.get('/faq', (req, res) => {
  console.log('1 - User Visiting FAQ', __dirname)
  res.sendFile(path.join(__dirname, 'static', 'faq.html'))
})

// post llm uses gpt_call to generate a response
// isAuthenticated, checkUserCredits,
/*
async function callChatGPT(
  post, 
  type = "gpt-4o-mini", 
  max_tokens = 4096, 
  tools = false, 
  chat = false,
  user_id = false
*/
app.post('/llm', jwtAuth, async (req, res) => {
  try {
    console.log('2 - User Visiting LLM')
    let { model, messages, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, tools, response_format, ...bodyRemainder } = req.body
    let chat = !tools && !response_format

    console.log('2 - ', req.user) //username, type, creditsBought, creditsUsed, iat, exp
    // console.log('2 - messages:', messages[0])
    // console.log('2 - ', req.body)
    const result = await callChatGPT(messages, model, 4096, tools, chat, req.user?.username || req.user?.googleId || '')
    console.log('2 - Result:', result)
    res.status(200).json(result)
  } catch (error) {
    console.error('Error in route handler:', error)
    res.status(500).json({ success: false, data: { message: 'Internal server error', error: error.message } })
  }
})

app.get('/payment-success', (req, res) => {
  console.log('User Visiting Payment-Success')
  res.sendFile(path.join(__dirname, 'client', 'payment-success.html'))
})

// Cache-busting for webpacked files
app.get('/popup.js', (req, res) => {
  console.log('User Visiting Popup.JS')
  // const fileName = req.params.fileName !== 'popup' ? `${req.params.fileName}.popup.js` : 'popup.js';
  res.sendFile(path.join(__dirname, 'dist', 'popup.js'))
})

app.get('/:cacheId.popup.js', (req, res) => {
  console.log('User Visiting Popup.JS')
  res.sendFile(path.join(__dirname, 'dist', `${req.params.cacheId}.popup.js`))
})

app.get('/popup.html', (req, res) => {
  console.log('User Visiting Popup.HTML')
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
} )

app.use(express.static(path.join(__dirname, 'dist')))
app.use(express.static(path.join(__dirname, 'client')))
app.use(express.static(path.join(__dirname, 'shared')))
app.use(express.static(path.join(__dirname, 'rsc')))
app.use(express.static(path.join(__dirname, 'static')))

app.get('/pdf.worker.mjs', (req, res) => {
  console.log('User Visiting Popup.HTML')
  // /node_modules/pdfjs-dist/build/pdf.worker.mjs
  res.sendFile(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs'))
})

// Modified route handling with authentication and credit check
routes.forEach(({ endpoint, method, action }) => {
  let noAuthEndpoints = ['/check-auth', '/login', '/signup', '/logout']
  if (noAuthEndpoints.includes(endpoint)) {
    return
  }

  // Skip login, signup, logout
  // All others get handled by isAuthenticated unless it has the word 'extension',
  // at which point jwtAuth is used.
  const checkCredits = action.split('.')[0] === 'gpt' ? [checkUserCredits] : [] 
  // const authMiddleware = action.includes('extension') ? jwtAuth : isAuthenticated 
  app[method.toLowerCase()](endpoint, jwtAuth, ...checkCredits, async (req, res) => {
    try {
      // console.log('Request body size:', JSON.stringify(req.body));
      const actionPath = action.split('.')
      const actionObject = actionPath[0] === 'db' ? db : gpt
      const actionMethod = actionPath[1]
      const data = method == 'GET' ? { ...req.params, ...req.query } : req.body
      // console.log('Request user:', req.user);

      data.user_id = req.user?.username || req.user?.googleId || ''
      console.log('\x1b[32m%s\x1b[0m %s \x1b[32m%s\x1b[0m \x1b[36m%s\x1b[0m', `${method}:`, endpoint, 'Calling', `${actionPath[0]}.${actionMethod}`)

      const result = await actionObject[actionMethod](data)
      // console.log('Result:', result);
      res.status(200).json(result)
    } catch (error) {
      console.error('Error in route handler:', error)
      res.status(500).json({ success: false, data: { message: 'Internal server error', error: error.message } })
    }
  })
})

app.listen(port, () => console.log('\x1b[32m%s\x1b[0m', `Server started http://localhost:${port}`))

/*
console.log('\x1b[36m%s\x1b[0m', 'index_middleware: blah blah blah');

31: Red
32: Green
33: Yellow
34: Blue
35: Magenta
36: Cyan

*/
