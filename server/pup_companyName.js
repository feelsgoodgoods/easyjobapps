const puppeteer = require("puppeteer");

// Retrieves a company name by searching duck duck go
async function search_companyOnDuckDuckGo(companyName) {
  console.log("search_companyOnDuckDuckGo: ", companyName);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  try {
    // Go to DuckDuckGo's search page
    await page.goto("https://duckduckgo.com/", { waitUntil: "networkidle2" });

    // Enter the company name in the search input and press Enter
    await page.type('input[name="q"]', companyName + String.fromCharCode(13)); // String.fromCharCode(13) is the Enter key

    // Wait for the navigation to complete
    await page.waitForNavigation({ waitUntil: "networkidle0" });

    // Extract the URL of the first search result
    const firstResultLink = await page.evaluate(() => {
      // Using the data-testid attribute to find the first link
      const firstResult = document.querySelector('a[data-testid="result-title-a"]');
      return firstResult ? firstResult.href : null;
    });

    return firstResultLink;
  } catch (error) {
    console.error(`Error searching for company on DuckDuckGo: ${companyName}`, error);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = {
  search_companyOnDuckDuckGo
};
