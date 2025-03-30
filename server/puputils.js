const puppeteer = require("puppeteer");

import { getSitemap } from "./pup_getSitemap.js";
import { search_companyOnDuckDuckGo } from "./pup_companyName.js";

// Crawl a website and return all the links
let uniqueLinks = new Set();
let crawledLinks = new Set();
function getPrimaryDomain(url) {
  const hostname = new URL(url).hostname;
  const parts = hostname.split(".").reverse();
  if (parts.length >= 3) {
    // Adjust based on expected domain formats
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  } else if (parts.length === 2) {
    return `${parts[1]}.${parts[0]}`;
  }
  return hostname;
}

function normalizeURL(url, base) {
  try {
    const urlObj = new URL(url, base);
    urlObj.hash = ""; // Remove the fragment
    urlObj.search = ""; // Remove query parameters
    if (urlObj.protocol === "http:") {
      urlObj.protocol = "https:"; // Convert to HTTPS
    }
    return urlObj.href;
  } catch (error) {
    console.error(`Error normalizing URL: ${url}`, error.message);
    return null;
  }
}

async function internalCrawl(link, browser, base) {
  const primaryDomain = getPrimaryDomain(base);
  const linkDomain = getPrimaryDomain(link);

  // Skip if already crawled
  if (crawledLinks.has(link)) {
    console.log(`Already crawled: ${link}`);
    return;
  }
  console.log(`Crawling ${link}`);
  crawledLinks.add(link);

  // If the link is from a subdomain, add to uniqueLinks but don't crawl
  if (linkDomain !== primaryDomain) {
    uniqueLinks.add(link);
    return; // Skip further processing for subdomains
  }

  const page = await browser.newPage();
  let chunks = [];

  try {
    await page.goto(link, { waitUntil: "networkidle2", timeout: 50000 });
    const primaryDomain = getPrimaryDomain(link);

    const relativeLinks = await page.evaluate(
      (primaryDomain, base) => {
        const links = Array.from(document.querySelectorAll("a"))
          .map(anchor => {
            if (anchor.protocol === "mailto:") {
              return null;
            }
            try {
              const normalizedUrl = new URL(anchor.href, base);
              normalizedUrl.hash = "";
              normalizedUrl.search = "";
              if (normalizedUrl.protocol === "http:") {
                normalizedUrl.protocol = "https:";
              }
              return normalizedUrl.href;
            } catch (error) {
              return null;
            }
          })
          .filter(href => href && href.includes(primaryDomain));
        return [...new Set(links)];
      },
      primaryDomain,
      base
    );

    await page.close();

    chunks.push(...relativeLinks.map(url => normalizeURL(url, base)).filter(url => url));

    for (let newLink of chunks) {
      if (!uniqueLinks.has(newLink) && !crawledLinks.has(newLink)) {
        uniqueLinks.add(newLink);
      }
    }

    for (let newLink of uniqueLinks) {
      if (!crawledLinks.has(newLink)) {
        await internalCrawl(newLink, browser, base);
      }
    }
  } catch (error) {
    console.error(`Failed to scrape ${link}:`, error.message);
  }
  return;
}

async function crawlUrl(initialLink) {
  const browser = await puppeteer.launch();
  try {
    await internalCrawl(normalizeURL(initialLink, initialLink), browser, initialLink);
  } finally {
    await browser.close();
    console.log(`Crawled ${crawledLinks.size} links`);
    return [...crawledLinks];
  }
}

//~~~~ ScrapeLinks => runs if record !text in extractCreateForPost and sitemapScrapeGenericSpecificLinks
async function scrapeLinks(links) {
  //console.log('scrapeLinks:', links)
  const browser = await puppeteer.launch({ headless: "new" }); // Launch browser instance here
  //console.log('scrapeLinks - Browser launched')
  const allChunks = [];
  //console.log('scrapeLinks - Starting', links.length)
  for (const link of links) {
    //console.log('scrapeLinks Link', link)
    const chunks = await scrapeLink(browser, link); // Pass the browser instance to scrapeLink
    allChunks.push(chunks);
    //console.log('scrapeLinks Finished', allChunks.length)
  }
  await browser.close(); // Close browser after all links are processed
  return allChunks;
}

async function scrapeLink(browser, link) {
  // console.log('scrapeLink:', link)
  const maxChunkSize = 24000;
  const overlapFraction = 0.2;

  const page = await browser.newPage(); // Use the passed browser instance
  let chunks = [];

  try {
    await page.goto(link, { waitUntil: "networkidle2", timeout: 10000 });
    // Extract text content
    // Call Karpatic Endpoint
    // const textContent = await page.evaluate(() => {
    //   document.querySelectorAll("script, style, img, link, svg, head, header, footer, nav, noscript, iframe").forEach(el => el.remove());
    //   document.querySelectorAll("*").forEach(el => {
    //     ["class", "style", "id", "role", "tabindex", "hidden", "target", "rel", "lang"].forEach(attr => el.removeAttribute(attr));
    //     Array.from(el.attributes).forEach(attr => {
    //       if (/^(aria-|data-)/.test(attr.name)) el.removeAttribute(attr.name);
    //     });
    //   });
    //   let text = document.body.innerHTML.replace(/(\r\n|\n|\r)/gm, " ");
    //   return text;
    // });
    let urlBase = "https://api.charleskarpati.com/pup/html?url=" || "http://localhost/html?url=";
    let textContent = fetch(urlBase + link).then(response => response.text());
    const textChunks = splitTextIntoChunks(textContent, maxChunkSize, overlapFraction);
    chunks = textChunks;
  } catch (error) {
    console.error(`Failed to scrape ${link}:`, error.message);
  } finally {
    await page.close(); // Close the page, but not the browser
  }
  return chunks;
}

export { getSitemap, crawlUrl, scrapeLinks, search_companyOnDuckDuckGo };
