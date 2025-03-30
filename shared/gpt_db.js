
import { queryDb } from './queryDb.js';
import './create_db.js' 

//
//
//
//
//
//
//
// DB FUNCTIONS CALLED BY GPT ROUTES AND SECONDARY FUNCTIONS
//
//
//
//
//
//
//

// routes_gpt.js:post_create
const checkExistingPost = async (jobPost, user_id) => {
  const existingPost = await queryDb("SELECT id, company_id FROM posts WHERE text = ? AND user_id = ?", [jobPost, user_id]);
  const badPost = await queryDb("SELECT id FROM junk WHERE text = ? AND user_id = ?", [jobPost, user_id]);
  return { existingPost, badPost };
};

// routes_gpt.js:post_create
async function deletePostFromDatabase(postId, user_id) {
  await queryDb(`DELETE FROM posts WHERE id = ? AND user_id = ?`, [postId, user_id]);
}

// addOrUpdateCompanyAndPostData
async function handleCompany(data) {
  let company_id = (await queryDb("SELECT id FROM companies WHERE companyName = ? AND user_id = ?", [data.companyName, data.user_id]))[0]?.id;
  console.log(':handleCompany:',{ company_id, companyName: data.companyName });
  if (!company_id) {
    await queryDb(`INSERT INTO companies (websiteUrl, companyName, user_id) VALUES (?, ?, ?)`, [data.websiteUrl, data.companyName, data.user_id]);
    company_id = (await queryDb("SELECT id FROM companies WHERE companyName = ? AND user_id = ?", [data.companyName, data.user_id]))[0]?.id;
  } 
  else {
    await queryDb(`UPDATE companies SET websiteUrl = ? WHERE companyName = ? AND user_id = ?`, [data.websiteUrl, data.companyName, data.user_id]);
  }
  return company_id;
}

//
// utils_gpt
//

// addOrUpdateCompanyAndPostData
async function insertJunkRecord(data) {
  await queryDb(`INSERT INTO junk (text, user_id) VALUES (?, ?)`, [data.text, data.user_id]);
}

// addOrUpdateCompanyAndPostData
async function selectPostsTable(data) { 
  let post = await queryDb("SELECT * FROM posts WHERE text = ? AND user_id = ?", [data.text, data.user_id]);
  return post;
}

// addOrUpdateCompanyAndPostData
async function insertPosts(data) {
  await Promise.all(
    data.jobs.map(async job => {
      await queryDb(`INSERT INTO posts (company_id, text, jobTitle, link, user_id) VALUES (?, ?, ?, ?, ?)`, [data.company_id, data.text, job.jobTitle, job.link, data.user_id]);
    })
  );
  const links = await queryDb("SELECT * FROM sitemaps WHERE company_id = ? AND user_id = ?", [data.company_id, data.user_id]);
  return links;
}

// addOrUpdateCompanyAndPostData
async function getExistingPost(postId, user_id) {
  const existingPost = await queryDb("SELECT id, company_id, jobTitle FROM posts WHERE id = ? AND user_id = ?", [postId, user_id]);
  return existingPost[0];
}
// extractCreateForPost
async function getPostMeta(post_id, user_id) {
  let post = await queryDb("SELECT * FROM posts WHERE id = ? AND user_id = ?", [post_id, user_id]);
  return post[0].meta;
}

// extractCreateForPost
async function updatePostMeta(post_id, meta, user_id) {
  await queryDb(`UPDATE posts SET meta = ? WHERE id = ? AND user_id = ?`, [JSON.stringify(meta), post_id, user_id]);
}

// extractCreateForPost
async function createOrUpdateExtract(company_id, post_id, extract, record, user_id) {
  console.log(':createOrUpdateExtract:',{ company_id, post_id, extract, record, user_id });
  let existingRecord = await queryDb("SELECT id FROM extracts WHERE post_id = ? AND sitemap_id = ? AND user_id = ?", [post_id, extract.sitemap_id, user_id]);
  if (!existingRecord.length) {
    console.log("4. extractCreateForPos - Creating extract record for extract id", extract.id);
    let sitemap_id = extract.type != "post" ? extract.id : 0;
    const insertSql = `INSERT INTO extracts (company_id, sitemap_id, post_id, type, status, extract, link, text, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await queryDb(insertSql, [company_id, sitemap_id, post_id, extract.type, 1, JSON.stringify(record), extract.link, extract.text, user_id]);
  } else {
    console.log("4. extractCreateForPos - Updating extract record");
    const updateSql = `UPDATE extracts SET extract = ? WHERE id = ? AND user_id = ?`;
    await queryDb(updateSql, [JSON.stringify(record), existingRecord[0].id, user_id]);
  }
}

//
// routes_gpt
//

// extracts_create_for_post
async function getSitemapsForCompany(company_id, user_id) {
  return await queryDb("SELECT * FROM sitemaps WHERE company_id = ? AND (specific = 1 OR generic = 1) AND user_id = ?", [company_id, user_id]);
}  
// extracts_create_for_post
async function getExtractsForPost(post_id, user_id) {
  return await queryDb("SELECT * FROM extracts WHERE post_id = ? AND user_id = ?", [post_id, user_id]);
}

// extracts_create_for_post
async function getPostsForCompanyAndPost(company_id, post_id, user_id) {
  return await queryDb("SELECT id, link, text FROM posts WHERE company_id = ? AND id = ? AND user_id = ?", [company_id, post_id, user_id]);
}
 // extracts_create_for_post & extract_create_for_post
async function getJobTitleAndCompanyName(post_id, company_id, user_id) {
  let jobTitle = (await queryDb("SELECT jobTitle FROM posts WHERE id = ? AND user_id = ?", [post_id, user_id]))[0].jobTitle;
  let companyName = (await queryDb("SELECT companyName FROM companies WHERE id = ? AND user_id = ?", [company_id, user_id]))[0].companyName;
  return { jobTitle, companyName };
}

// extract_create_for_post
async function getExtractById(extract_id, user_id) {
  return (await queryDb("SELECT * FROM extracts WHERE id = ? AND user_id = ?", [extract_id, user_id]))[0];
}

// refine_yaml
async function getContent(body) {
  let { companyid, postid, resumeid, coverletterid, user_id } = body;
  // console.log('GET CONTENT RECEIVED:', Object.keys(body)) // , body);

  const defaultBio = (await queryDb("SELECT id, text FROM userinfo WHERE label = 'bio' AND user_id = ?", [user_id]))[0]?.text || '';

  let extracts = await queryDb("SELECT * FROM extracts WHERE post_id = ? AND status = 1 AND type <> 'post' AND user_id = ?", [postid, user_id]);
  let extractDetails = extracts.map(extract => extract.extract);

  extractDetails = JSON.stringify(extractDetails.map(details => Object.fromEntries(Object.entries(JSON.parse(details)).filter(([k, v]) => v.length))));

  let defaultResume = (await queryDb("SELECT * FROM userinfo WHERE id = ? AND user_id = ?", [resumeid, user_id]))[0]?.text;

  let defaultCoverLetter = (await queryDb("SELECT * FROM userinfo WHERE id = ? AND user_id = ?", [coverletterid, user_id]))[0]?.text;
  
  let company = (await queryDb("SELECT * FROM companies WHERE id = ? AND user_id = ?", [companyid, user_id]))[0];

  let post = (await queryDb("SELECT * FROM posts WHERE id = ? AND user_id = ?", [postid, user_id]))[0];

  let returnThis = {
    given: { body },
    extracts,
    extractDetails,
    defaultResume,
    defaultCoverLetter,
    company,
    post,
    defaultBio
  };

//   // print first 100 and last 100 characters of each string
//   console.log(":dbgpt:getContent FINISHED: ", { 
//     defaultResumeLen: defaultResume && defaultResume.length,
//     defaultCoverLetterLen: defaultCoverLetter && defaultCoverLetter.length,
//     // defaultCoverLetter: defaultCoverLetter && defaultCoverLetter.slice(0, 100) + '...' + defaultCoverLetter.slice(-100),
// } ) //, returnThis); 

  return returnThis;
}

let dbutils = {
  checkExistingPost,
  deletePostFromDatabase,
  handleCompany, 
  insertJunkRecord,
  selectPostsTable,
  insertPosts, 
  createOrUpdateExtract,
  getJobTitleAndCompanyName, 
  getExtractById, 
  getPostMeta,
  updatePostMeta, 
  getSitemapsForCompany,
  getExtractsForPost,
  getPostsForCompanyAndPost,
  getExistingPost, 
  getContent
};

export { dbutils };
