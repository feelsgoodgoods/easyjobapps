const puppeteer = require("puppeteer");
const { getPrimaryDomain, normalizeURL } = require("./pup");

// Use an LLM to crawl and extract job posts from a list of links

//~~~~ ScrapeJobs
async function crawlJobLinks(links) {
  const allJobsPromises = links.map(link => crawlJobLink(link.link));
  const allJobsResults = await Promise.all(allJobsPromises);
  let allJobs = allJobsResults.flat();
  console.log("crawlJobLinks - Found", allJobs.length, "job posts: ", allJobs);
  allJobs = await mergeDuplicateJobPosts(allJobs);
  return allJobs;
}

// Dedupe JobTitles for when the info surrounding a link to a jobpost get saved too.
async function mergeDuplicateJobPosts(allJobs) {
  const jobMap = new Map();

  allJobs.forEach(job => {
    if (jobMap.has(job.jobTitle)) {
      // Retrieve the existing job and merge the current job's link and text into it
      const existingJob = jobMap.get(job.jobTitle);
      // Ensure post content is not 'undefined'; adjust for your data structure as necessary
      const additionalPostContent = job.text ? `\nAdditional info: ${job.text}` : "";
      existingJob.text += `\nSee also: ${job.link}${additionalPostContent}`;
      jobMap.set(job.jobTitle, existingJob);
    } else {
      // For unique job titles, just add the job to the map
      jobMap.set(job.jobTitle, job);
    }
  });

  // Convert the map values back to an array
  return Array.from(jobMap.values());
}

// Gets html from a link using puppeteer
// The html is passed to callChatGPT(prompt) using a user and system prompt
// The response is a structured json object of extracted job posts and any links to other job posts or job boards
// This process continues recursively until all job posts are extracted
async function crawlJobLink(link) {
  const browser = await puppeteer.launch();
  const visitedLinks = new Set();
  const jobPosts = []; // [{ jobTitle, text, link}]
  const maxChunkSize = 24000;
  const overlapFraction = 0.2;
  const linkHops = new Map(); // Tracks the number of hops from the original link

  async function internalCrawl(currentLink, hops = 0) {
    if (visitedLinks.has(currentLink)) return;
    visitedLinks.add(currentLink);
    linkHops.set(currentLink, hops);

    const page = await browser.newPage();
    try {
      await page.goto(currentLink, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise(r => setTimeout(r, 5000));
      await page.evaluate(() => {
        document.querySelectorAll("script, style, img, link, svg, head, header, footer, nav, noscript, iframe").forEach(el => el.remove());
        document.querySelectorAll("*").forEach(el => {
          ["class", "style", "id", "role", "tabindex", "hidden", "target", "rel", "lang"].forEach(attr => el.removeAttribute(attr));
          Array.from(el.attributes).forEach(attr => {
            if (/^(aria-|data-)/.test(attr.name)) el.removeAttribute(attr.name);
          });
        });
      });

      const rawHTML = await page.content();
      const htmlChunks = splitTextIntoChunks(rawHTML, maxChunkSize, overlapFraction);

      console.log(`crawlJobLink - Scraped ${htmlChunks.length} chunk from ${currentLink}`);
      /*
      for (const [index, chunk] of htmlChunks.entries()) {
        const filename = `./utils/chunks/${index}.txt`;
        await fs.promises.writeFile(filename, chunk);
      }
      */

      console.log('~~~~~~~~~~~~~~~~ CALLING INTERNETCRAWL::  ~~~~~~~~~~')
      for (const [index, chunk] of htmlChunks.entries()) {
        let chatGPTResponse = await callChatGPT([
          {
            role: "system",
            content: `
You are an AI job information extractor that returns json data.
Process the user provided text, extract the following information and return it in the form shown below: 
{
  jobPosts:[ { jobTitle, text } ], 
  linkToJobBoards:[], 
  linkToJobPosts:[], 
  otherJobRelatedLinks:[] 
}
Ensure all the links are accurately captured, use a full URL and include the protocol (http/https).
jobPosts - An object array where each entry contains a job title and job post (with any relevant details not found directly in the post itself but pertitant to it).
linkToJobPosts - each value is a link to a specific job post.
For the job post, style the content using html limited to the following tags and nothing else: p, a, ul, ol, li, strong, br, and i. You are not to use font or span tags.
Return an empty array for attributes where valid values are not found.
`
          },
          {
            role: "user",
            content: chunk
          }
        ]);

        // Add Post to Posts
        try {
          chatGPTResponse = JSON.parse(chatGPTResponse);
        } catch (error) {
          chatGPTResponse = { jobPosts: [] };
        }
        for (const jobPost of chatGPTResponse?.jobPosts || []) {
          jobPost.link = currentLink;
          jobPosts.push(jobPost);
        }

        // Crawl potential links
        // 2 hop limit, or on same domain, dedupes happen at start
        const potentialLinks = chatGPTResponse?.linkToJobBoards.concat(chatGPTResponse.linkToJobPosts).filter(Boolean) || [];
        const jobBoardLinks = chatGPTResponse?.linkToJobBoards.filter(Boolean) || [];
        for (const potentialLink of [...potentialLinks, ...jobBoardLinks]) {
          const normalizedLink = normalizeURL(potentialLink, currentLink);
          const nextHops = linkHops.get(currentLink) + 1;
          if (normalizedLink && !visitedLinks.has(normalizedLink) && (nextHops <= 2 || getPrimaryDomain(normalizedLink) === getPrimaryDomain(link))) {
            await internalCrawl(normalizedLink, nextHops);
          }
        }
      }
    } catch (error) {
      console.error(`crawlJobLink - Failure. No action necessary. Failed link:${currentLink}:`, error);
    } finally {
      await page.close();
    }
  }

  await internalCrawl(normalizeURL(link, link)); // Start crawling from the initial link
  await browser.close(); // Ensure the browser is closed once all crawling is done
  return jobPosts; // Return the accumulated job posts
}

module.exports = {
  crawlJobLinks,
  crawlJobLink
};
