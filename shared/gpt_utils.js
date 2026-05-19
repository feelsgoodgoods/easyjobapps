// console.log("gptutils.js: Loaded");
import { db } from "./db.js"; 

import { gpt } from "./gpt.js"; // addOrUpdateCompanyAndPostData:extracts_create_for_post
import { pup } from "./pup_gpt.js"; // gptCompanyDat:crawlCompanyName, extractFromPost:sitemapUpdateLinkText

import { callChatGPT, splitTextIntoChunks, mergeRecords } from "./gpt_call.js";

//
//
//
//
//
//
//
// SECONDARY AI FUNCTIONS
//
//
//
//
//
//
//

//~~~~ Basics


// puppeteer. Does NOT create record.
async function gptCompanyAndPostData(jobPost, user_id, oaikey) {
  console.group("GPT:gptCompany:");
  const post = [
    {
      role: "system",
      content: `
You are an AI job information extractor that returns json data.
Process the user provided text, extract the following information and return it in the form shown below: 
{ 
companyName: [],
websiteUrl: [],
jobs:[ { jobTitle, link } ]
}
Ensure all the links are accurately captured and use a full URL that includes the protocol (http/https).
companyName - The company's name or empty if the text is not a job post or in the url.
websiteUrl - The company's website URL.
jobs - An object array where each entry contains a job title and a link to the job post (if it exists). 
Return an empty array for attributes where valid values are not found.`
    },
    {
      role: "user",
      content: jobPost
    }
  ] 
  const chatGPTResponse = await callChatGPT(post, "gpt-4.1-mini", 4096, false, false, user_id, oaikey);
  const companyRecord = JSON.parse(chatGPTResponse);
  if (!companyRecord) {
    console.groupEnd();
    return false;
  }
  companyRecord.companyName = companyRecord.companyName[0];
  companyRecord.websiteUrl = companyRecord.websiteUrl[0] || (companyRecord.companyName && (await pup.crawlCompanyName(companyRecord.companyName))) || '';
  companyRecord.jobs = companyRecord.jobs;
  companyRecord.text = jobPost;
  console.groupEnd();
  return companyRecord;
}

// 1. Sends bad queries to junk,
// 2. updates existing company records with post info.
// 3. inserts post info into posts table.
async function addOrUpdateCompanyAndPostData(metaData) {
  console.group("addOrUpdateCompanyAndPostData"); 
  let {companyName, jobs, websiteUrl, user_id} = metaData 
  let company_id = false; 
  if (!companyName || jobs.length == 0) {
    console.log(":db:insertJunkRecord");
    await db.insertJunkRecord(metaData);
    console.groupEnd();  
    return false;
  }  
  console.log(":handlecompany:")//, Object.keys(metaData));
  company_id = await db.handleCompany(metaData); // Insert or updates
  // console.log("handlecompany ID::", { company_id });  
  let post = (await db.selectPostsTable(metaData))[0]; // Uses gptCompanyDat.text to find post.
  console.log(":db.selectPostsTable:#CheckExist") //, JSON.stringify(post)); 
  let post_id = post?.id;
  if (!post_id) {
    console.group(":INSERT POST:");
    // console.log(":db:insertPost:");s
    metaData.company_id = company_id;
    let links = await db.insertPosts(metaData);
    if (!links.find(link => link.link === websiteUrl)) {
      // links = (await pup.sitemap(company_id, "sitemap")).links;
      links = []
    }
    console.log("db:selectPost:");
    post = (await db.selectPostsTable(metaData))[0]; 
    post_id = post?.id;
    post_id && console.log(":extracts_create_for_post:");
    post_id && (await gpt.extracts_create_for_post({ company_id, post_id, user_id })); 
    post = await db.getExistingPost(post_id, user_id);
    console.groupEnd();
  } else {
    console.log("POST:ALREADYEXISTS:");
  }
  post.companyName = companyName
  // console.log('addOrUpdateCompanyAndPostData RETURNING POST:', post);
  console.groupEnd();  
  return post;
}

//~~~~ Post

const maxChunkSize = 24000;
const overlapFraction = 0.2;

//
let extract = async (insert, attributes, text, retries = 0, user_id = false, oaikey = false) => {
  console.log('~~~~~~~~~~~~~~~~ CALLING EXRACT::~~~~~~~~~~')
  let txt = `
You are an AI job information extractor that returns json data.
Process the user provided text, extract the following information and return it in the form shown below: 
{${attributes}}
Ensure all the links are accurately captured and use a full URL that includes the protocol (http/https).
The returned JSON should be a flat object with no nested structures.
Every single attribute should be an array, even if it contains only one value.
Return an empty array for attributes when valid values are not found.
    `;
  let parsedResponse;
  let prompt = [
    {
      role: "system",
      content: txt
    },
    {
      role: "user",
      content: text
    }
  ]
  let gpt = await callChatGPT(prompt, "gpt-4.1-mini", 4096, false, false, user_id, oaikey )
  try {
    parsedResponse = JSON.parse(gpt);
  } catch (error) {
    // console.log(`extract - gpt failed: ${error.message} \n\n retries: ${retries} \n\n `);
    // text: ${text}`);

    if (error.message.includes("Unexpected token")) {
      // console.log("extract- unexpected token");
      parsedResponse = {};
    }
    if (error.message.includes("Unexpected end of JSON input")) {
      // console.log("extract - Unexpected end of input");
      parsedResponse = {};
    } else {
      if (retries == 0) {
        parsedResponse = JSON.parse(await extract(insert, attributes, text, retries + 1));
      } else {
        // console.log("extract - gpt failed for really real.", gpt);
        parsedResponse = {};
      }
    }
  }
  return parsedResponse;
};

// Extract -> GENERIC
let extractCompanyInfo = async record => {
  const textChunks = splitTextIntoChunks(record.text, maxChunkSize, overlapFraction);
  // record.link && console.log("3. extractCompanyInfo | record.link:", JSON.stringify(record.link));
  let coInsert = `You will be given companyTEXT from the company website of "${record.companyName}".`;
  let company = `achievements,clients,coreActivities,culture,currentEvents,founded,industry,investors,mission,partners,products,size,whyWorkForUs`;
  let companyRecords = textChunks.map(async (chunk, index) => {
    return await extract(coInsert, company, chunk, 0, record.user_id, record.oaikey);
  });
  companyRecords = await Promise.all(companyRecords);
  const mergedObject = await mergeRecords(companyRecords);
  return mergedObject;
};

// Extract -> JOB POST / SPECIFIC LINK
let extractJobInfo = async (record, attrs = "") => {
  // record.link && console.log("3. extractJobInfo | record.link:", JSON.stringify(record.link));
  const textChunks = splitTextIntoChunks(record.text, maxChunkSize, overlapFraction);
  let jobInsert = `You will be given companyTEXT of a job posting for the position of "${record.jobTitle}" at the company "${record.companyName}".`;
  attrs = `remoteAvailable,isRemote,instructionsToApplicant,emailApplicationTo,emailApplicationSubjectLine,applicationUrl,supplementalUrls,`;
  let job = `${attrs}benefits,careerPageOrJobsBoard,compensation,departmentOrTeam,description,education,expectations,experience,infrastructure,languages,qualifications,responsibilities,role,skills,tasks,terms,tools`;
  let jobRecords = textChunks.map(async chunk => {
    return await extract(jobInsert, job, chunk, 0, record.user_id, record.oaikey);
  });
  jobRecords = await Promise.all(jobRecords);
  const mergedObject = await mergeRecords(jobRecords);
  return mergedObject;
};

// ExtractJobInfo + ExtractCompanyInfo
let extractFromPost = async record => {
  // console.log("3. extractFromPost"); // , JSON.stringify(record))
  // Run these two async functions in parallel
  let jobRecordPromise = extractJobInfo(record);
  let companyRecordPromise = extractCompanyInfo(record);
  let [jobRecord, companyRecord] = await Promise.all([jobRecordPromise, companyRecordPromise]);
  let merged = {
    ...jobRecord[0],
    ...companyRecord[0]
  };
  return merged;
};

async function extractCreateForPost(extract, companyName, jobTitle, force, post_id, company_id, user_id, oaikey) {
  console.group(":extractCreateForPost:");
  console.log(extract);
  if (extract.extract && !force) {
    console.log(':Premature-END:')
    console.groupEnd();
    return false;
  }
  if (!extract.text) {
    // console.log("extractCreateForPos - Fetching Text for extract.id", { sitemap_id: extract.id });
    extract.text = await pup.sitemapUpdateLinkText({
      sitemap_id: extract.id,
      user_id,
      oaikey
    });
  }
  let record = false;
  if (extract.type == "specific") { 
    record = await extractFromPost({
      companyName,
      jobTitle,
      ...extract,
      user_id,
      oaikey
    });
  } else if (extract.type == "generic") {
    record = (
      await extractCompanyInfo({
        companyName,
        jobTitle,
        ...extract,
        user_id,
        oaikey
      })
    )[0];
  } else if (extract.type == "post") {
    //
    // Use a part of the record to update the meta for the post.
    //
    //
    record = await extractFromPost({
      companyName,
      jobTitle,
      ...extract,
      user_id,
      oaikey
    });
    let meta = await db.getPostMeta(post_id);  

    meta = JSON.parse(meta);
    
    let { instructionsToApplicant, emailApplicationTo, emailApplicationSubjectLine, applicationUrl, supplementalUrls, remoteAvailable } = record;
    let newMeta = {
      instructionsToApplicant,
      emailApplicationTo,
      emailApplicationSubjectLine,
      applicationUrl,
      supplementalUrls,
      remoteAvailable
    }; 
    Object.keys(newMeta).forEach(key => {
      delete record[key];
      let val = newMeta[key] || [""];
      if (val.length) {
        val = val[0];
      }
      meta[key] = newMeta[key];
    }); 
    await db.updatePostMeta(post_id, meta);
    console.log('Updated Post Meta, Got record...', {post_id, meta})
  } else {
    // console.log("extractCreateForPos: unknown type", extract);
  }
  if (record) {
    await db.createOrUpdateExtract(company_id, post_id, extract, record);
  } 
  console.log("extractCreateForPost:END", record);
  console.groupEnd();
  return record;
}

//~~~~ Export

let gptutils = {
  gptCompanyAndPostData,
  addOrUpdateCompanyAndPostData,
  extractCreateForPost,
  extract,
  extractCompanyInfo,
  extractJobInfo,
  extractFromPost
};
export { gptutils };
