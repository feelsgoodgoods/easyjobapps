const parseString = require("xml2js").parseString;

// Function to fetch and parse a sitemap
async function getSitemap(url) {
  console.log("getSitemap - ", url);
  let sitemapUrls = await getAllSitemapUrls(url);
  // console.log("Sitemap List: ", sitemapUrls);
  let links = (await Promise.all(sitemapUrls.map(async sitemapUrl => await parseSitemap(sitemapUrl)))).flat();
  // filter false values
  links = links.filter(Boolean);
  console.log("Got # of links:", typeof links, links?.length);
  const seen = [];
  const uniqueLinks = links
    .map(link => (!seen.includes(link.loc[0]) ? seen.push(link.loc[0]) && link : false))
    .filter(el => {
      return el;
    });
  const sortedLinks = await sortLinks(uniqueLinks);
  let returnThis = sortedLinks.map(link => link.loc[0]);
  return returnThis;
}

module.exports = {
  getSitemap
};

async function sortLinks(links) {
  let keywords = ["staff", "jobs", "career"];
  try {
    return links.sort((a, b) => {
      // Check if URLs contain any of the keywords
      const containsKeywordA = keywords.some(keyword => a.loc[0].includes(keyword));
      const containsKeywordB = keywords.some(keyword => b.loc[0].includes(keyword));

      if (containsKeywordA && !containsKeywordB) {
        return -1; // a has a keyword and b does not, a should come first
      } else if (!containsKeywordA && containsKeywordB) {
        return 1; // b has a keyword and a does not, b should come first
      }

      // If both have keywords or neither have, then sort by priority
      let priorityA = parseFloat(a.priority[0]);
      let priorityB = parseFloat(b.priority[0]);

      if (priorityA === priorityB) {
        // If priorities are equal, sort by lastmod date
        let dateA = new Date(a.lastmod[0]);
        let dateB = new Date(b.lastmod[0]);
        return dateB - dateA; // For descending order of dates
      }

      return priorityB - priorityA; // Sort in descending order of priority
    });
  } catch (err) {
    console.log("Error w/ sortLinks: ", err);
    return links;
  }
}

// Main function to get all sitemap URLs
async function getAllSitemapUrls(domain) {
  const domainsToCheck = [domain];
  const parentDomain = new URL(domain).hostname.split(".").slice(-2).join(".");
  if (parentDomain !== domain) {
    domainsToCheck.push(`https://${parentDomain}`);
  }

  const sitemaps = await Promise.all(
    domainsToCheck.map(async domainToCheck => {
      const sitemapsFromRobotsTxt = await getSitemapsFromRobotsTxtOnDomain(domainToCheck);
      // console.log("FINISHED SEARCHING DOMAIN", domainToCheck, { sitemapsFromRobotsTxt }, '\n\n ')
      return sitemapsFromRobotsTxt;
    })
  );

  // Flatten the array of arrays into a single array
  return sitemaps.flat();
}

// Function to fetch and parse robots.txt
async function getSitemapsFromRobotsTxtOnDomain(domainToCheck) {
  let sitemapLinks = [];
  await Promise.all(
    ["./sitemap.xml", "./sitemap.txt"].map(async endPath => {
      let sitemapStatus = false;
      const sitemapPath = new URL(endPath, domainToCheck).href;
      try {
        // console.log('Checking sitemapPath:', sitemapPath)
        let resp = await fetch(sitemapPath);
        if (resp.status === 200) {
          sitemapStatus = true;
          sitemapLinks.push(sitemapPath);
        }
      } catch (error) {
        // console.error(`No sitemap found at: domainToCheck, ${error.message}`);
      }
      // console.log('Found sitemap:', sitemapStatus, sitemapPath)
      return;
    })
  );

  /*
  const robotsTxtUrl = new URL('/robots.txt', domainToCheck);
  const response = await fetch(robotsTxtUrl.href);
  if (response.status === 200) {
    const robotsTxtContent = await response.text();
    const lines = robotsTxtContent.split('\n');
    for (const line of lines) {
      let flag = line.trim().toLowerCase().startsWith('sitemap:')
      if (flag) {
        const parts = line.split('itemap:');
        const sitemapPath = parts[1].trim();
        if (!sitemapLinks.includes(sitemapPath)) {
          // console.log("Adding sitemap link: ", { domainToCheck, sitemapPath })
          sitemapLinks.push(sitemapPath);
        }
        else {
          // console.log("Already have sitemap link: ", sitemapPath)
        }
      }
    }
  }
  */
  // console.log('Returning sitemapLinks:', sitemapLinks)

  return sitemapLinks;
}

// Function to fetch and parse a sitemap
async function parseSitemap(sitemapUrl) {
  try {
    const response = await fetch(sitemapUrl, { timeout: 10000 });
    if (!response.ok) {
      console.error(`Error fetching sitemap at ${sitemapUrl}: ${response.statusText}`);
      return false;
    }
    let links = await response.text();
    console.log(`parseSitemap found sitemapUrl ${sitemapUrl}`); // ${links}
    if (sitemapUrl.endsWith(".txt")) {
      links = links.split("\n").map(link => {
        return { loc: [link] };
      });
    } else {
      links = await new Promise((resolve, reject) => {
        parseString(links, (err, result) => {
          if (err) {
            console.error(`Error parsing sitemap at ${sitemapUrl}`); // ${err.message}
            reject(err); // Reject the promise if there's an error
          } else {
            resolve(result); // Resolve the promise with the parsed result
          }
        });
      });
      // !links?.urlset?.url && console.log('parseSitemap - links:', links?.urlset, links?.urlset?.url, links?.urlset?.url[0])
      links = links?.urlset?.url || [];
    }

    return links.map(urlObj => {
      urlObj.sitemap = sitemapUrl;
      urlObj.priority = urlObj.priority || 1;
      // changefreq
      return urlObj;
    });
  } catch (error) {
    console.error(`Error fetching or parsing sitemap at ${sitemapUrl}: ${error.message}`);
    return false;
  }
}
