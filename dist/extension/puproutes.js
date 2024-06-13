import { db } from "./dbroutes.js";

let { getSitemap, crawlUrl, scrapeLinks, search_companyOnDuckDuckGo } 
  = 
  window 
    ? 
    await import("./puputils.js") 
    : 
    await import("../utils/puputils.js");

async function crawlCompanyName(name) {
  return await search_companyOnDuckDuckGo(name);
}
// Add links if not already there.
async function sitemap(company_id, mode) {
  console.groupCollapsed("pup:SITEMAP");
  console.log(":", { mode });
  if (!parseInt(company_id)) {
    console.log("sitemap - ERROR: company_id=FALSE");
    return false;
  }
  let companyRecord = await db.getCompanyRecord(company_id);
  console.log(":db:", mode == "sitemap" ? "getSitemap" : "crawlUrl");
  let links = mode == "sitemap" && (await getSitemap(companyRecord.websiteUrl, mode));
  links || mode == "crawl" ? await crawlUrl(companyRecord.websiteUrl) : [];
  // if (mode == 'sitemap' && links.length == 0) { console.log('nolinksfound') }
  for (const link of links) {
    try {
      if (!link || !link.trim().toLowerCase().startsWith("http")) {
        continue;
      }
      console.log(":db:insertLinkIfNotExists");
      await db.insertLinkIfNotExists(company_id, link);
    } catch (e) {
      console.log("sitemap - ERROR INSERTING LINK", link, e);
    }
  }
  console.log(":db:insertLinksIfNotExists");
  await db.insertLinksIfNotExists(company_id, links);
  console.log(":GOT:", links.length, "links");
  console.groupEnd();
  return { status: "success", links };
}
/*
// Crawls all board links inserts or updates link and text in `posts` table.
async function sitemap_crawl_board_links(company_id) {
  if (!parseInt(company_id)) {
    console.log("company_id=FALSE");
    return false;
  }
  let links = await getBoardLinks(company_id);
  console.log("sitemap_crawl_board_links - ", links.length, "link(s).");

  const crawledJobPosts = await crawlJobLinks(links);

  await insertOrUpdateJobPosts(crawledJobPosts, company_id);

  let posts = await getJobPosts(company_id);
  return {
    status: "success",
    posts
  };
}

// Update and generic_specific_links => Scrape Links where status=1 and !text
async function sitemap_update_link(body) {
  console.log("sitemap_update_link", body);
  let { company_id, ...updates } = body;
  let id = Object.keys(updates)[0].split("_")[1];
  // Grab all the links for this company
  let generic = (updates["generic_" + id] && 1) || 0;
  let specific = (updates["specific_" + id] && 1) || 0;
  let board = (updates["board_" + id] && 1) || 0;

  await updateSitemaps(generic, specific, board, id);

  if (specific || generic) {
    await sitemapScrapeGenericSpecificLinks({ company_id });
  }

  links = await getCompanySitemaps(company_id);
  return { status: "success", links };
} 

// Calls Scrape Links where status=1 and !text
async function sitemapScrapeGenericSpecificLinks(body) {
  console.log("sitemapScrapeGenericSpecificLinks", body);
  let { company_id, force } = body;
  if (!parseInt(company_id)) {
    console.log("company_id=FALSE");
    return false;
  }

  // Retrieves all links == generic for job postings.
  let links = await retrieveGenericLinks(company_id);
  // console.log('process_generic_links', links)

  // Filter out links that have text already.
  links = !force && links.filter(link => !link.text);

  // Retrieves all text from links.
  let texts = await scrapeLinks(links.map(a => a.link));

  links.map(async (link, i) => {
    links.map(async (link, i) => {
      await updateSitemapText(link, texts[i]);
    });
  });

  let posts = await getJobPosts(company_id);
  return {
    status: "success",
    posts
  };
}
*/

// Scrape Link
async function sitemapUpdateLinkText(body) {
  let { sitemap_id } = body;
  console.log("sitemapUpdateLinkText - ", sitemap_id);
  if (!parseInt(sitemap_id)) {
    console.log("sitemap_id=FALSE");
    return false;
  }

  let link = await db.getLinkById(sitemap_id);
  let text = (await scrapeLinks([link]))[0][0];

  await db.updateSitemapText(link, text);
  return text;
}

let pup = { crawlCompanyName, sitemap, sitemapUpdateLinkText, crawlUrl, scrapeLinks, search_companyOnDuckDuckGo };

export { pup };
