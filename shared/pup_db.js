// called from: Puppy

import { queryDb } from './misc.js'; 

//
async function getCompanyRecord(company_id, user_id) {
    return (await queryDb("SELECT * FROM companies WHERE id = ? AND user_id = ?", [company_id, user_id]))[0];
  }
  
  //
  async function getJobDetails(post, user_id) {
    post = (await queryDb("SELECT id, jobTitle, company_id FROM posts WHERE id = ? AND user_id = ?", [post.post_id, user_id]))[0];
    return post;
  }
  
  //
  async function getCompanyName(post, user_id) {
    let companyName = (await queryDb("SELECT companyName FROM companies WHERE id = ? AND user_id = ?", [post.company_id, user_id]))[0]?.companyName;
    return companyName;
  }
  
  //
  async function getEmailDefaultBio(user_id) {
    const defaultBio = (await queryDb("SELECT id, text FROM userinfo WHERE label = 'bio' AND user_id = ?", [user_id]))[0].text;
    return defaultBio;
  }
  
  //
  async function getEmailData(resume_id, email_id, company_id, post_id, user_id) {
    let resume = (await queryDb("SELECT * FROM userinfo WHERE id = ? AND user_id = ?", [resume_id, user_id]))[0]?.text;
    let email = (await queryDb("SELECT * FROM userinfo WHERE id = ? AND user_id = ?", [email_id, user_id]))[0]?.text;
    let company = (await queryDb("SELECT * FROM companies WHERE id = ? AND user_id = ?", [company_id, user_id]))[0];
    let post = (await queryDb("SELECT * FROM posts WHERE id = ? AND user_id = ?", [post_id, user_id]))[0];
    return { resume, email, company, post };
  }
  
  //
  async function getPostByUpload(postupload, user_id) {
    let post = (await queryDb("SELECT id, jobTitle, company_id FROM posts WHERE text = ? AND user_id = ?", [postupload, user_id]))[0];
    return post;
  }
  
   
  //
  async function insertLinkIfNotExists(company_id, link, user_id) {
    let existingLink = await queryDb("SELECT id FROM sitemaps WHERE company_id = ? AND link = ? AND user_id = ?", [company_id, link, user_id]);
    if (existingLink.length === 0) {
      await queryDb("INSERT INTO sitemaps (company_id, link, user_id) VALUES (?, ?, ?)", [company_id, link, user_id]);
    }
  }
  
  //
  async function insertLinksIfNotExists(company_id, links, user_id) {
    for (const link of links) {
      try {
        if (!link || !link.trim().toLowerCase().startsWith("http")) {
          continue;
        }
        let existingLink = await queryDb("SELECT id FROM sitemaps WHERE company_id = ? AND link = ? AND user_id = ?", [company_id, link, user_id]);
        if (existingLink.length === 0) {
          await queryDb("INSERT INTO sitemaps (company_id, link, user_id) VALUES (?, ?, ?)", [company_id, link, user_id]);
        }
      } catch (e) {
        console.log("sitemap - ERROR INSERTING LINK", link, e);
      }
    }
  }
  
  //
  async function updateSitemaps(generic, specific, board, id, user_id) {
    await queryDb(`UPDATE sitemaps SET generic = ?, specific = ?, board = ? WHERE id = ? AND user_id = ?`, [generic, specific, board, id, user_id]);
  }
  
  //
  async function getCompanySitemaps(company_id, user_id) {
    return await queryDb("SELECT * FROM sitemaps WHERE company_id = ? AND user_id = ?", [company_id, user_id]);
  }
  
  //
  async function retrieveGenericLinks(company_id, user_id) {
    return await queryDb("SELECT * FROM sitemaps WHERE (specific = 1 OR generic = 1) AND company_id = ? AND user_id = ?", [company_id, user_id]);
  }
  
  //
  async function getLinkById(sitemap_id, user_id) {
    let link = (await queryDb("SELECT * FROM sitemaps WHERE id = ? AND user_id = ?", [sitemap_id, user_id]))[0].link;
    return link;
  }
  
  //
  async function updateSitemapText(link, text, user_id) {
    await queryDb(`UPDATE sitemaps SET text = ? WHERE id = ? AND user_id = ?`, [text, link.id, user_id]);
  }
  
  //
  async function getBoardLinks(company_id, user_id) {
    return await queryDb("SELECT * FROM sitemaps WHERE company_id = ? AND board = 1 AND user_id = ?", [company_id, user_id]);
  }
  
  //
  async function insertOrUpdateJobPosts(crawledJobPosts, company_id, user_id) {
    await Promise.all(
      crawledJobPosts.map(async job => {
        const records = await queryDb("SELECT id, text, jobTitle FROM posts WHERE company_id = ? AND jobTitle = ? AND user_id = ?", [company_id, job.jobTitle, user_id]);
        if (!records.length) {
          const insertSql = `INSERT INTO posts (company_id, text, jobTitle, link, user_id ) VALUES (?, ?, ?, ?, ?)`;
          await queryDb(insertSql, [company_id, job.text, job.jobTitle, job.link, user_id]);
        } else {
          if (records[0].text.length < job.text.length || records[0].link !== job.link) {
            const updateSql = `UPDATE posts SET text = ?, link = ? WHERE id = ? AND user_id = ?`;
            await queryDb(updateSql, [job.text, job.link, records[0].id, user_id]);
          }
        }
        return;
      })
    );
  }
  
  //
  async function getJobPosts(company_id, user_id) {
    return await queryDb("SELECT * FROM posts WHERE company_id = ? AND user_id = ?", [company_id, user_id]);
  }


  let dbutils = { 
    insertLinkIfNotExists,
    insertLinksIfNotExists,
    updateSitemaps,
    retrieveGenericLinks,
    updateSitemapText, 
    getCompanyRecord, 
    getJobPosts, 
    getLinkById,
    getBoardLinks,
    getCompanySitemaps, 
    getJobDetails,
    getCompanyName,
    getEmailData,
    getEmailDefaultBio,
    getPostByUpload
  };