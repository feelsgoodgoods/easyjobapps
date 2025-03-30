// console.log("dbroutes.js: Loaded");
 

import { queryDb } from './queryDb.js'
import { dbutils } from './gpt_db.js'
let pup = {}

//
//
//
//
//
//
//
// DB FUNCTIONS CALLED BY CLIENT
//
//
//
//
//
//
//

// called by index_login
async function login(body) {
  console.group('db:login')
  let id = body.username
  let dbUser = await queryDb('SELECT * FROM users WHERE id = ?', [id])
  //
  //
  /// Retrieve all the user information now?
  //
  //
  console.log('Retrieved dbUser:', dbUser)
  return dbUser
}

async function logout(body) {
  console.group('db:logout')
  console.groupEnd()
  return { status: 'success', data: false}
}
async function signup(body) {
  console.group('db:signup')
  let sql = 'INSERT INTO users (email, password, id) VALUES (?, ?, ?)'
  let params = [body.email, body.password, body.username]
  queryDb(sql, params)
  login(body)
  console.groupEnd()
}
//
//

async function payment(paymentData) {
  // Extract the fields from paymentData
  const { username, status, total, date, id, guestPasswordHash, credits } = paymentData

  // Create signup if not exist. use username as password.
  const user = await queryDb('SELECT * FROM users WHERE id = ?', [username])
  if (!user.length) {
    console.log(`PAYMENT: Creating new user ${username} `) 
    await signup({ username, password: guestPasswordHash })
  }

  // Insert the payment record into the payments table
  await queryDb(`INSERT INTO payments (payment_id, description, credits, user_id) VALUES (?, ?, ?, ?)`,
    [id, date, total, username],
  )

  // Grab the credits value from the most recent record
  const creditsOnRecord = await queryDb('SELECT credits FROM credits WHERE user_id = ? ORDER BY dateAdded DESC LIMIT 1', [username])
  const userCredits = creditsOnRecord[0] ? creditsOnRecord[0].credits : 0
  // Insert the new credits records
  await queryDb(`INSERT INTO credits (description, credits, user_id) VALUES (?, ?, ?)`, [`${date}::${id}`, userCredits + credits, username])
  console.log(`Payment record inserted successfully for user: ${username}`, userCredits, credits, userCredits + credits)
  return true // Return success response
}

let credits_update = async (userId, tokensUsed) => {
  console.log(`db: Updating credits for user ${userId}, tokens used: ${tokensUsed}`); 
  const credits = await queryDb('SELECT credits FROM credits WHERE user_id = ? ORDER BY dateAdded DESC LIMIT 1', [userId]);
  const userCredits = credits.length ? credits[0].credits : 0;

  // Step 3: Calculate the updated credits after deduction
  const updatedCredits = userCredits - tokensUsed;

  // Step 4: Insert the new credits record with updated balance
  await queryDb(`INSERT INTO credits (description, credits, user_id, dateAdded) VALUES (?, ?, ?, ?)`, 
    [`Credits deducted: ${tokensUsed}`, updatedCredits, userId, new Date().toISOString()]);

  console.log(`Credits updated successfully for user ${userId}. New balance: ${updatedCredits}`);
  return true; // Return success response
};

// Middleware to check user credits
let credit_check = async (req, res, next) => {
  console.log('-- Checking user credits')
  if (!req.user) {
    return res.status(401).json({ status: false, error: 'Unauthorized' })
  }
  try {
    console.log('-- QUERYDB FOR CREDITS')
    const userCredits = await queryDb('SELECT credits FROM credits WHERE user_id = ?', [req.user.username || req.user.id])
    console.log('-- USER CREDITS', userCredits)
    if (!userCredits || userCredits.credits <= 0) {
      return res.status(403).json({ status: false, error: 'Insufficient credits.' })
    }
    req.userCredits = userCredits.credits
    console.log('-- SUCCESS')
    next()
  } catch (error) {
    console.error('Error checking user credits:', error)
    res.status(500).json({ status: false, error: 'checkCredits server error' })
  }
}

// INDEX_LOGIN.JS Handles /LOGIN /LOGOUT /CHECK-AUTH

//~~~~ User Info
//
async function userinfo_copy(body) {
  console.group('db:userinfo_copy', body)
  let { bio, resumes, coverletters, username, credits, openaikey, jwt } = body
  
  // Create or Update the user info in the database
  // DB LABELS: bio openaikey, resumetemplates coverlettertemplates
  !!username && await userinfo_update_single({ bio, user_id: username })
  !!username && await userinfo_update_single({ openaikey, user_id: username })
  !!resumes && await resumes.map(async (resume) => {
    await userinfo_upload({ 
      label: 'resumetemplates', 
      text: resume.text, 
      title: resume.title, 
      user_id: username 
    })
  })
  coverletters && await coverletters.map(async (coverletter) => {
    await userinfo_upload({ 
      label: 'coverlettertemplates', 
      text: coverletter.text, 
      title: coverletter.title, 
      user_id: username 
    })
  })
  return { status: 'success' }
}

async function userinfo_view(body) {
  let { label, user_id } = body
  // console.log("DB:userinfo_view:P1 ", { body }); 
  const rows = await queryDb('SELECT id, text, title FROM userinfo WHERE label = ? AND user_id = ?', [label, user_id])
  // console.log("DB:userinfo_view:P2 ", { rows });
  // ['resumetemplates', 'bio', 'coverlettertemplates'].includes(label) ? '' : console.log("DB:userinfo_view:P2 ", { rows });
  return { status: 'success', data: rows }
}

//
async function userinfo_upload(body) {
  console.group('db:userinfo_upload')
  let { label, text, title, user_id } = body 

  // Check if the record already exists
  let query = 'SELECT id FROM userinfo WHERE title = ? AND label = ? AND user_id = ?'
  let existingRecord = await queryDb(query, [title, label, user_id])
  // console.log(existingRecord.length ? ':UPDATE' : ':EDIT', { title, label, existingRecord }) 
  
  // Insert or Update the record
  query = !existingRecord.length ? 
    `INSERT INTO userinfo (text, title, label, user_id) VALUES (?, ?, ?, ?)` : 
    'UPDATE userinfo SET text = ? WHERE title = ? AND label = ? AND user_id = ?'
  let data = await queryDb(query, [text, title, label, user_id]) 

  // retrieve the updated record
  let updatedRecord = await queryDb('SELECT * FROM userinfo WHERE title = ? AND label = ? AND user_id = ?', [title, label, user_id])
  console.log('userinfo_upload:', updatedRecord)

  console.groupEnd()
  return { status: 'success', data: updatedRecord[0]  }
}

// for bio and openaikey
async function userinfo_update_single(body) {
  console.group('db:userinfo_update_single')
  let { bio, openaikey, applysettings, user_id } = body
  let data = false
  let label = (body.hasOwnProperty('bio') && 'bio') 
           || (body.hasOwnProperty('openaikey') && 'openaikey') 
           || (body.hasOwnProperty('applysettings') && 'applysettings') || ''
  let value = bio || openaikey || applysettings || '' 
  const existingRecord = await queryDb('SELECT id FROM userinfo WHERE label = ? AND user_id = ?', [label, user_id])
  if (!existingRecord.length) {
    const insertSql = `INSERT INTO userinfo (text, title, label, user_id) VALUES (?, ?, ?, ?)`
    data = await queryDb(insertSql, [value, label, label, user_id])
    console.log(`${label} inserted successfully.`)
  } 
  else {
    console.log(':UPDATE', body, { user_id, value, label, existingRecord })
    const updateSql = `UPDATE userinfo SET text = ? WHERE label = ? AND user_id = ?`
    data = await queryDb(updateSql, [value, label, user_id])
    console.log(`${label} updated successfully:`, value)
  }
  console.groupEnd()
  return { status: 'success', data }
}

//
async function userinfo_update(body) {
  let { userinfoid, text, user_id } = body
  console.group('DB:USERINFO_UPDATE: ', body)
  let id = parseInt(userinfoid)
  const checkSql = `SELECT id FROM userinfo WHERE id = ? AND user_id = ?`
  const record = queryDb(checkSql, [id, user_id])
  if (!record) {
    console.error(`No record found with id: ${id}`)
    console.groupEnd()
    return { status: 'success', error: `No record found with id: ${id}` }
  }
  const updateSql = `UPDATE userinfo SET text = ? WHERE id = ? AND user_id = ?`
  await queryDb(updateSql, [text, id, user_id])
  console.groupEnd()
  return {
    status: 'success',
    data: { userinfoid, text },
  }
}

//
async function userinfo_remove(body) {
  console.group('db:userinfo_remove')
  let { userinfoid, user_id } = body
  console.log(body)
  let id = parseInt(userinfoid)
  let data = await queryDb(`DELETE FROM userinfo WHERE id = ? AND user_id = ?;`, [id, user_id])
  console.groupEnd()
  return {
    status: 'success',
    id,
  }
}

//~~~~ Basics

// view the post

// Pulls postData from db.
async function post_view(body) { 
  console.log('db:post_view')
  // console.groupCollapsed('db:post_vie', body)
  let { id, user_id } = body
  const post = await queryDb('SELECT * FROM posts WHERE id = ? AND user_id = ?', [id, user_id]) 
  if (!post.length){ 
    // console.groupEnd(); 
    return { status: 'success', data: [] } 
  }
  const company = await queryDb('SELECT companyName FROM companies WHERE id = ? AND user_id = ?', [post[0].company_id, user_id])
  post[0].companyName = company[0].companyName
  // console.groupEnd()
  return { status: 'success', data: post[0] }
}

//
async function post_update_status(body) {
  console.group('db:post_update_status')
  let { company_id, post_id, jobStatus, force, user_id } = body
  status = parseInt(jobStatus)
  post_id = parseInt(post_id)
  company_id = parseInt(company_id)
  console.log('post_update_status', body, status, post_id, company_id, force)
  const record = queryDb(`SELECT id FROM posts WHERE id = ? AND user_id = ?`, [post_id, user_id])
  if (record) {
    await queryDb(`UPDATE posts SET status = ? WHERE id = ? AND user_id = ?`, [status, post_id, user_id])
  }
  console.groupEnd()
  return {
    status: 'success',
    data: { company_id, post_id, status },
  }
}

// Update Post
async function post_update(body) { 
  // grab record by body.id
  // update record with body values 
  let { type, resume, coverletter, post_id} = body 
  post_id = parseInt(post_id) 
  console.group('db:post_update', body, post_id)
  let record = await queryDb(`SELECT id FROM posts WHERE id = ?`, [post_id])
  if (record) {
    console.log('record', record)
    if (type === 'resume') {
      await queryDb(`UPDATE posts SET resume = ? WHERE id = ?`, [resume, post_id])
    }
    else if (type === 'coverletter') {
      await queryDb(`UPDATE posts SET coverletter = ? WHERE id = ?`, [coverletter, post_id])
    }
    // get everything from the record
    record = await queryDb(`SELECT * FROM posts WHERE id = ?`, [post_id])
  //   await queryDb(`UPDATE posts SET resume = ?, coverletter = ? WHERE id = ? AND user_id = ?`, [resume, coverletter, post_id, user_id])
  }
  else{
    console.log(`No record found with id: ${post_id}`)
    return { status: 'failure', error: `No record found with id: ${post_id}` }
  }
  console.groupEnd()
  console.log('record', typeof(record?.[0]), record)
  // get companyName from company_id
  let company = await queryDb('SELECT companyName FROM companies WHERE id = ?', [record[0].company_id])
  record[0].companyName = company[0].companyName
  return {
    status: 'success',
    data: record[0],
  }
}

async function extension_post_update(body){
  return post_update(body)
}

// If new websiteUrl then fetch sitemap.txt
async function company_update(params) {
  console.group('db:company_update')
  let { company_id, status, websiteUrl, user_id } = params
  let links

  try {
    status = parseInt(status)
    company_id = parseInt(company_id)
    const record = queryDb(`SELECT id FROM companies WHERE id = ? AND user_id = ?`, [company_id, user_id])
    if (!record) {
      console.error(`No record found with id: ${company_id}`)
      return {
        status: 'failure',
        params: { company_id: false, status: false, links: false },
      }
    }

    await queryDb(`UPDATE companies SET status = ?, websiteUrl = ? WHERE id = ? AND user_id = ?`, [status, websiteUrl, company_id, user_id])
    links = await queryDb('SELECT * FROM sitemaps WHERE company_id = ? AND user_id = ?', [company_id, user_id])
    if (!links.find((link) => link.link === websiteUrl)) {
      links = (await pup.sitemap(company_id, 'sitemap')).links
    }
    console.groupEnd()
    return {
      status: 'success',
      params: { company_id, status, links },
    }
  } catch (error) {
    console.error('Error updating record:', error.message)
    return {
      status: 'failure',
      params: { company_id, status, links },
    }
  }
}

//~~~~ Sitemap

// Does not grab link Text
async function sitemap_create_link(body) {
  console.group('db:sitemap_create_link')
  const { company_id, link, generic, specific, board, user_id } = body
  console.log('sitemap_create_link', body)
  const existingRecord = await queryDb('SELECT id FROM sitemaps WHERE link = ? AND user_id = ?', [link, user_id])
  if (!existingRecord.length) {
    const insertSql = `INSERT INTO sitemaps (company_id, link, generic, specific, board, user_id) VALUES (?, ?, ?, ?, ?, ?)`
    await queryDb(insertSql, [company_id, link, generic, specific, board, user_id])
    console.log('Sitemap record inserted successfully for link:', link)
  } else {
    console.log('Sitemap record already exists for link:', link)
  }
  links = await queryDb('SELECT * FROM sitemaps WHERE company_id = ? AND user_id = ?', [company_id, user_id])
  console.groupEnd()
  return { status: 'success', links }
}

async function sitemap_remove_link(body) {
  console.group('db:sitemap_remove_link')
  let { id, user_id } = body
  await queryDb(`DELETE FROM sitemaps WHERE id = ? AND user_id = ?;`, [id, user_id])
  console.groupEnd()
  return {
    status: 'success',
    params: { id },
  }
}

//~~~~ Post

async function extracts_view_for_post(id, user_id) {
  console.group('db:extracts_view_for_post')
  let post_id = parseInt(id.split('_')[1])
  if (!parseInt(post_id)) {
    console.log('post_id=FALSE')
    return false
  }
  extracts = await queryDb('SELECT * FROM extracts WHERE post_id = ? AND user_id = ?', [post_id, user_id])
  console.groupEnd()
  return { status: 'success', extracts }
}

// User hit 'Save Changes' on edit page
async function extract_update(body) {
  console.group('db:extract_update')
  let { extract_id, toggleUse, fromUrlLbl, originalText, user_id, ...extractDetails } = body
  console.log('extract_update - ', {
    fromUrlLbl,
    extract_id,
    toggleUse,
    extractDetails,
  })
  extract = Object.fromEntries(Object.entries(extractDetails).map(([k, v]) => [k, v.includes('\n') ? v.split('\n') : !v ? [] : [v]]))
  let status = toggleUse === 'on' ? 1 : 0
  console.log('toggleUse - ', { extract, fromUrlLbl, status, extract_id })
  const record = await queryDb(`SELECT id FROM extracts WHERE id = ? AND user_id = ?`, [extract_id, user_id])
  console.log('record', record)
  if (record.type != 'post') {
    await queryDb(`UPDATE sitemaps SET text = ? WHERE id = ? AND user_id = ?`, [originalText, extract_id, user_id])
  }
  await queryDb(`UPDATE extracts SET status = ?, extract = ?, text = ? WHERE id = ? AND user_id = ?`, [status, JSON.stringify(extract), originalText, extract_id, user_id])
  console.groupEnd()
  return { status: 'success', extract: { extract_id, status } }
}

//~~~~ Resume

async function extension_post_fetch(body) {
  console.group('db:extension_post_fetch')
  let { postId, companyId, companyName, jobTitle, userMessage, user_id } = body
  let post = false

  if (postId) {
    post = (await queryDb('SELECT * FROM posts WHERE id = ? AND user_id = ?', [postId, user_id]))[0]
    if (!post) {
      console.log('extension_post_fetch FAILED FOR POST:', postId)
    }
  }
  if (!post && companyName) {
    let company = await queryDb('SELECT * FROM companies WHERE companyName LIKE ? AND user_id = ?', [`%${companyName}%`, user_id])
    if (!company.length) {
      console.log('extension_post_fetch FAILED FOR COMPANY: ', companyName)
    }
    let potential_posts = await company.map(async (company) => {
      let post = false
      if (jobTitle) {
        let post = await queryDb('SELECT * FROM posts WHERE jobTitle LIKE ? AND company_id = ? AND user_id = ?', [`%${jobTitle}%`, company.id, user_id])
        post = post.length ? post : false
        if (!post) {
          console.log('JOB NOT FOUND LOOKING FOR', jobTitle)
        }
      }
      if (!post) {
        post = await queryDb('SELECT * FROM posts WHERE company_id = ? AND user_id = ?', [company.id, user_id])
      }
      return post
    })
    potential_posts = (await Promise.all(potential_posts)).flat()
    console.log('potential_posts', potential_posts)
    if (potential_posts.length) {
      post = potential_posts[0]
    }
  }
  if (post) {
    console.log('lookatthis!', post)
    postId = post.id
    companyId = post.company_id
    jobTitle = post.jobTitle
    companyName = (await queryDb('SELECT companyName FROM companies WHERE id = ? AND user_id = ?', [companyId, user_id]))[0].companyName
  }
  console.groupEnd()
  return {
    status: 'success',
    companyId,
    postId,
    companyName,
    jobTitle,
    userMessage,
  }
}

//DBFN // match where company name is substring of companyName
async function search_company(body) {
  let { companyName, user_id } = body
  if (!companyName) {
    return { status: 'failure' }
  }
  let companies = await queryDb('SELECT * FROM companies WHERE companyName LIKE ? AND user_id = ?', [`%${companyName}%`, user_id])

  companies = await companies.map(async (company) => {
    company.posts = await queryDb('SELECT id, jobTitle FROM posts WHERE company_id = ? AND user_id = ?', [company.id, user_id])
    return company
  })
  companies = await Promise.all(companies)
  return { status: 'success', data: companies }
}

//~~~~

async function getpostcreate(jobPost, user_id) {
  console.group('getpostcreate')
  const existingPost = await queryDb('SELECT id, company_id FROM posts WHERE text = ? AND user_id = ?', [jobPost, user_id])
  const badPost = await queryDb('SELECT id FROM junk WHERE text = ? AND user_id = ?', [jobPost, user_id])
  console.groupEnd()
  return { existingPost, badPost }
}

//~~~~

let db = {
  login,
  logout,
  signup,
  payment,
  credits_update,
  userinfo_copy,
  userinfo_upload,
  userinfo_view,
  userinfo_update,
  userinfo_remove,
  post_view,
  post_update,
  extension_post_update,
  userinfo_update_single,
  search_company,
  ...dbutils,
}

export { db }
