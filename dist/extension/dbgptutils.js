let misc = false;
let browser = typeof window != 'undefined'
let cfpages = typeof process == 'undefined' 
let queryDb = async (sql, params = [], env={}) => {
  if (browser) {
    // console.log('dbroutes:BROWSER' )
    misc = await import("./misc.js");
  }
  else{
    if(!cfpages){
      console.log('server:dbroutes:DEV' );
    }
    else{
      console.log('server:dbroutes:CF_PAGES' );
    }
    misc = await import("../../utils/misc.js");
  } 
  queryDb = misc.queryDb;
  queryDb(sql, params, env);
}

let createAuthTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        tempToken TEXT,
        uuid TEXT
    )`);
} 
 
let createUserInfoTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS userinfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        text TEXT,
        title TEXT,
        label TEXT,
        company_id INTEGER DEFAULT 0,
        post_id INTEGER DEFAULT 0
    )`);
}
 

let createCompanyTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        status INTEGER DEFAULT 0,
        websiteUrl TEXT,
        companyName TEXT
    )`);
} 

let createJunkTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS junk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT
    )`);
} 

let createPostsTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        status INTEGER DEFAULT 0,
        reject INTEGER DEFAULT 0, 
        company_id INTEGER,
        meta TEXT DEFAULT '{}',
        text TEXT,
        jobTitle TEXT,
        link TEXT,
        resume TEXT,
        coverLetter TEXT
    )`);
} 

let createSitemapTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS sitemaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT UNIQUE,
        generic INTEGER DEFAULT 0,
        specific INTEGER DEFAULT 0,
        board INTEGER DEFAULT 0,
        company_id INTEGER,
        text TEXT
      );`);
} 

let createExtractsTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS extracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        sitemap_id INTEGER DEFAULT 0,
        post_id INTEGER, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        type TEXT,
        status INTEGER DEFAULT 0,
        extract TEXT,
        link TEXT,
        text TEXT
    )`);
} 

createAuthTable();
createUserInfoTable();
createCompanyTable();
createJunkTable();
createPostsTable();
createSitemapTable();
createExtractsTable();

// post_create
const checkExistingPost = async jobPost => {
  // console.log(`> DBUTILS:CHECKEXISTINGPOST:SELECTX2`);
  const existingPost = await queryDb("SELECT id, company_id FROM posts WHERE text = ?", [jobPost]);
  const badPost = await queryDb("SELECT id FROM junk WHERE text = ?", [jobPost]);
  return { existingPost, badPost };
};

async function deletePostFromDatabase(postId) {
  // console.log(`DB:DELETEPOSTFROMDATABASE`);
  await queryDb(`DELETE FROM posts WHERE id = ?`, [postId]);
}

// Handle Company Table
async function handleCompany(data) {
  // console.log(`DB:HANDLECOMPANY:SELECT`);
  let company_id = (await queryDb("SELECT id FROM companies WHERE companyName = ?", [data.companyName]))[0]?.id;
  if (!company_id) {
    // console.log(`DB:HANDLECOMPANY:INSERT`);
    await queryDb(`INSERT INTO companies (websiteUrl, companyName) VALUES (?, ?)`, [data.websiteUrl, data.companyName]);
    company_id = (await queryDb("SELECT id FROM companies WHERE companyName = ?", [data.companyName]))[0]?.id;
  } else {
    // console.log(`DB:HANDLECOMPANY:UPDATE`);
    await queryDb(`UPDATE companies SET websiteUrl = ? WHERE companyName = ?`, [data.websiteUrl, data.companyName]);
  }
  return company_id;
}

async function insertJunkRecord(data) {
  // console.log(`DB:insertJunkRecord:INSERT`);
  await queryDb(`INSERT INTO junk (text) VALUES (?)`, data.text);
}

async function selectPostsTable(data) { 
  // console.log(`DB:selectPostsTable:SELECT`);
  let post = await queryDb("SELECT id FROM posts WHERE text = ?", [data.text]);
  return post;
}

async function insertPosts(data, company_id) {
  await Promise.all(
    data.jobs.map(async job => {
      // console.log("DB:INSERTPOST:INSERT");
      await queryDb(`INSERT INTO posts (company_id, text, jobTitle, link) VALUES (?, ?, ?, ?)`, [company_id, data.text, job.jobTitle, job.link]);
    })
  );
  // console.log("DB:INSERTPOST:SELECT");
  const links = await queryDb("SELECT * FROM sitemaps WHERE company_id = ?", [company_id]);
  return links;
}

async function getCompanyRecord(company_id) {
  // console.log(`DB:GETCOMPANYRECORD:SELECT`);
  return (await queryDb("SELECT * FROM companies WHERE id = ?", [company_id]))[0];
}

async function insertLinkIfNotExists(company_id, link) {
  // console.log(`DB:INSERTLINKIFNOTEXISTS:SELECT`);
  let existingLink = await queryDb("SELECT id FROM sitemaps WHERE company_id = ? AND link = ?", [company_id, link]);
  if (existingLink.length === 0) {
    // console.log(`DB:INSERTLINKIFNOTEXISTS:INSERT`);
    await queryDb("INSERT INTO sitemaps (company_id, link) VALUES (?, ?)", [company_id, link]);
  } else {
    // // console.log('sitemap - Link already exists', existingLink)
  }
}

async function insertLinksIfNotExists(company_id, links) {
  for (const link of links) {
    try {
      if (!link || !link.trim().toLowerCase().startsWith("http")) {
        continue;
      }
      // console.log(`DB:INSERTLINKSIFNOTEXISTS:SELECT`);
      let existingLink = await queryDb("SELECT id FROM sitemaps WHERE company_id = ? AND link = ?", [company_id, link]);
      if (existingLink.length === 0) {
        // console.log(`DB:INSERTLINKSIFNOTEXISTS:INSERT`);
        await queryDb("INSERT INTO sitemaps (company_id, link) VALUES (?, ?)", [company_id, link]);
      } else {
        // // console.log('sitemap - Link already exists', existingLink)
      }
    } catch (e) {
      // console.log("sitemap - ERROR INSERTING LINK", link, e);
    }
  }
}

async function updateSitemaps(generic, specific, board, id) {
  // console.log(`DB:UPDATESITEMAPS:UPDATE`);
  await queryDb(`UPDATE sitemaps SET generic = ?, specific = ?, board = ? WHERE id = ?`, [generic, specific, board, id]);
}

async function getCompanySitemaps(company_id) {
  // console.log(`DB:GETCOMPANYSITEMAPS:SELECT`);
  return await queryDb("SELECT * FROM sitemaps WHERE company_id = ?", [company_id]);
}

async function retrieveGenericLinks(company_id) {
  // console.log(`DB:RETRIEVEGENERICLINKS:SELECT`);
  return await queryDb("SELECT * FROM sitemaps WHERE (specific = 1 OR generic = 1) AND company_id = ?;", [company_id]);
}

// get link at sitemap_id
async function getLinkById(sitemap_id) {
  // console.log(`DB:GETLINKBYID:SELECT`);
  let link = (await queryDb("SELECT * FROM sitemaps WHERE id = ?", [sitemap_id]))[0].link;
  return link;
}

async function updateSitemapText(link, text) {
  // console.log(`DB:UPDATESITEMAPTEXT:UPDATE`);
  await queryDb(`UPDATE sitemaps SET text = ? WHERE id = ?`, [text, link.id]);
}

// Grabs all links from sitemaps where board = 1
async function getBoardLinks(company_id) {
  // console.log(`DB:GETBOARDLINKS:SELECT`);
  return await queryDb("SELECT * FROM sitemaps WHERE company_id = ? AND board = 1", [company_id]);
}

// Create a dedicated function for inserting or updating job posts
async function insertOrUpdateJobPosts(crawledJobPosts, company_id) {
  await Promise.all(
    crawledJobPosts.map(async job => {
      const records = await queryDb("SELECT id, text, jobTitle FROM posts WHERE company_id = ? AND jobTitle = ?", [company_id, job.jobTitle]);
      if (!records.length) {
        // console.log(`DB:INSERTORUPDATEJOBPOSTS:INSERT`);
        const insertSql = `INSERT INTO posts (company_id, text, jobTitle, link ) VALUES (?, ?, ?, ?)`;
        await queryDb(insertSql, [company_id, job.text, job.jobTitle, job.link]);
      } else {
        if (records[0].text.length < job.text.length || records[0].link !== job.link) {
          // console.log(`DB:INSERTORUPDATEJOBPOSTS:UPDATE`);
          const updateSql = `UPDATE posts SET text = ?, link = ? WHERE id = ?`;
          await queryDb(updateSql, [job.text, job.link, records[0].id]);
        } else {
          // console.log("insertOrUpdateJobPosts - No Update Needed", job.jobTitle);
        }
      }
      return;
    })
  );
}

// Gets job post for each post.
async function getJobPosts(company_id) {
  // console.log(`DB:GETJOBPOSTS:SELECT`);
  return await queryDb("SELECT * FROM posts WHERE company_id = ?", [company_id]);
}

async function getExtractById(extract_id) {
  // console.log(`DB:GETEXTRACTBYID:SELECT`);
  return (await queryDb("SELECT * FROM extracts WHERE id = ?", [extract_id]))[0];
}

async function getJobTitleAndCompanyName(post_id, company_id) {
  // console.log(`DB:GETJOBTITLEANDCOMPANYNAME:SELECTX2`);
  let jobTitle = (await queryDb("SELECT jobTitle FROM posts WHERE id = ?", [post_id]))[0].jobTitle;
  let companyName = (await queryDb("SELECT companyName FROM companies WHERE id = ?", [company_id]))[0].companyName;
  return { jobTitle, companyName };
}

async function getExtractsForPost(post_id) {
  // console.log(`DB:GETEXTRACTSFORPOST:SELECT`);
  return await queryDb("SELECT * FROM extracts WHERE post_id = ?", [post_id]);
}

// grab all posts at post_id => filter those in extracts
// Function to get posts for a company and post_id
async function getPostsForCompanyAndPost(company_id, post_id) {
  // console.log(`DB:GETPOSTSFORCOMPANYANDPOST:SELECT`);
  return await queryDb("SELECT id, link, text FROM posts WHERE company_id = ? AND id = ?", [company_id, post_id]);
}

async function getPostMeta(post_id) {
  // console.log(`DB:GETPOSTMETA:SELECT`);
  let post = await queryDb("SELECT * FROM posts WHERE id = ?", [post_id]);
  return post[0].meta;
}

async function updatePostMeta(post_id, meta) {
  // console.log(`DB:UPDATEPOSTMETA:UPDATE`);
  await queryDb(`UPDATE posts SET meta = ? WHERE id = ?`, [JSON.stringify(meta), post_id]);
}

//  { extract }, 'record', Object.fromEntries(Object.entries(record).map(([key, value]) => [key, JSON.stringify(value)])))
async function createOrUpdateExtract(company_id, post_id, extract, record) {
  console.log('gpt:createOrUpdateExtract:',{ company_id, post_id, extract, record });
  let existingRecord = await queryDb("SELECT id FROM extracts WHERE post_id = ? AND sitemap_id = ?", [post_id, extract.sitemap_id]);
  if (!existingRecord.length) {
    // console.log("4. extractCreateForPos - Creating extract record for extract id", extract.id);
    let sitemap_id = extract.type != "post" ? extract.id : 0;
    const insertSql = `INSERT INTO extracts (company_id, sitemap_id, post_id, type, status, extract, link, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await queryDb(insertSql, [company_id, sitemap_id, post_id, extract.type, 1, JSON.stringify(record), extract.link, extract.text]);
  } else {
    // console.log("4. extractCreateForPos - Updating extract record");
    const updateSql = `UPDATE extracts SET extract = ? WHERE id = ?`;
    await queryDb(updateSql, [JSON.stringify(record), existingRecord[0].id]);
  }
}

async function getSitemapsForCompany(company_id) {
  // console.log(`DB:GETSITEMAPSFORCOMPANY:SELECT`);
  return await queryDb("SELECT * FROM sitemaps WHERE company_id = ? AND (specific = 1 OR generic = 1)", [company_id]);
}

async function getEmailDefaultBio() {
  // console.log(`DB:GETEMAILDEFAULTBIO:SELECT`);
  const defaultBio = (await queryDb("SELECT id, text FROM userinfo WHERE label = 'bio'", []))[0].text;
  return defaultBio;
}

async function getEmailData(resume_id, email_id, company_id, post_id) {
  // console.log(`DB:GETEMAILDATA:SELECTX4`);
  let resume = (await queryDb("SELECT * FROM userinfo WHERE id = ?", [resume_id]))[0]?.text;
  let email = (await queryDb("SELECT * FROM userinfo WHERE id = ?", [email_id]))[0]?.text;
  let company = (await queryDb("SELECT * FROM companies WHERE id = ?", [company_id]))[0];
  let post = (await queryDb("SELECT * FROM posts WHERE id = ?", [post_id]))[0];
  return { resume, email, company, post };
}

async function getPostByUpload(postupload) {
  // console.log(`DB:GETPOSTBYUPLOAD:SELECT`);
  let post = (await queryDb("SELECT id, jobTitle, company_id FROM posts WHERE text = ?", [postupload]))[0];
  return post;
}
async function getExistingPost(postId) {
  // console.log(`DB:GETEXISTINGPOST:SELECT`);
  const existingPost = await queryDb("SELECT id, company_id, jobTitle FROM posts WHERE id = ?", [postId]);
  return existingPost[0];
}
// get jobTitle and companyName
async function getJobDetails(post) {
  // console.log(`DB:GETJOBDETAILS:SELECT`);
  post = (await queryDb("SELECT id, jobTitle, company_id FROM posts WHERE id = ?", [post.post_id]))[0];
  return post;
}

async function getCompanyName(post) {
  // console.log(`DB:GETCOMPANYNAME:SELECT`);
  let companyName = (await queryDb("SELECT companyName FROM companies WHERE id = ?", [post.company_id]))[0]?.companyName;
  return companyName;
}

//
//
// Convenience Fn
//
//

// get bio text
// async function getDefaultBioAndResume() { 
//   let defaultBio = (await queryDb("SELECT id, text FROM userinfo WHERE label = 'bio'", []))[0].text;
//   let defaultResume = (await queryDb("SELECT * FROM userinfo WHERE title = 'Default' AND label = 'resume'", []))[0].text;
//   return { defaultBio, defaultResume };
// }

// for each input call chatgpt
// async function getPostText(postId) {
//   if (postId) {
//     // console.log(`DB:GETPOSTTEXT:SELECT`);
//     let post = (await queryDb("SELECT * FROM posts WHERE id = ?", [postId]))[0].text;
//     return post;
//   } else {
//     return false;
//   }
// }

async function getContent(body) {
  let { companyid, postid, resumeid, coverletterid } = body;
  console.log("Given body:", body);

  // Get bio
  const defaultBio = (await queryDb("SELECT id, text FROM userinfo WHERE label = 'bio'", []))[0].text;

  // Get extracts
  let extracts = await queryDb("SELECT * FROM extracts WHERE post_id = ? AND status = 1 AND type <> 'post'", [postid]);
  let extractDetails = extracts.map(extract => extract.extract);

  // Remove all attributes with empty arrays values
  extractDetails = JSON.stringify(extractDetails.map(details => Object.fromEntries(Object.entries(JSON.parse(details)).filter(([k, v]) => v.length))));

  // Get resume
  let defaultResume = (await queryDb("SELECT * FROM userinfo WHERE id = ?", [resumeid]))[0]?.text;

  // Get coverLetter
  let defaultCoverLetter = (await queryDb("SELECT * FROM userinfo WHERE id = ?", [coverletterid]))[0]?.text;

  // Get company
  let company = (await queryDb("SELECT * FROM companies WHERE id = ?", [companyid]))[0];

  // Get post
  let post = (await queryDb("SELECT * FROM posts WHERE id = ?", [postid]))[0];

  let returnThis = {
    extracts,
    extractDetails,
    defaultResume,
    defaultCoverLetter,
    company,
    post,
    defaultBio
  };

  console.log(":dbutils:getContent:", returnThis);

  return returnThis;
}

let dbutils = {
  checkExistingPost,
  deletePostFromDatabase,
  handleCompany,
  insertJunkRecord,
  selectPostsTable,
  insertPosts,
  insertLinkIfNotExists,
  insertLinksIfNotExists,
  updateSitemaps,
  retrieveGenericLinks,
  updateSitemapText,
  createOrUpdateExtract,
  getJobTitleAndCompanyName,
  getCompanyRecord,
  getExtractById,
  getJobPosts,
  getPostMeta,
  updatePostMeta,
  getLinkById,
  getBoardLinks,
  getCompanySitemaps,
  getSitemapsForCompany,
  getExtractsForPost,
  getPostsForCompanyAndPost,
  getExistingPost,
  getJobDetails,
  getCompanyName,
  getEmailData,
  getEmailDefaultBio,
  getPostByUpload,
  getContent
};

export { dbutils };
