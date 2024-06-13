import { Hono } from "hono"; 

const app = new Hono();
 
//app.get("/", (ctx) => ctx.text("Hello world, this is Hono!!"));

// Serve HTML for the main menu
app.get("/", (ctx) => {
  const env = ctx.env;
  const { method, headers } = ctx.req; 
  console.log(`Request Method: ${method}`); 
  console.log(`Content-Type: ${JSON.stringify(ctx.req)}`); 
  const customValue = env ? env.YOUR_OPENAI_API_KEY : 'No ENV Key';
  console.log(`Custom ENV value: ${JSON.stringify(env)}`);

  let html = "<h1>Hacker News Posts</h1>";
  html += "<p>Endpoints:</p>";
  html += "<ul>";
  html += "<li><a href='/posts-bulk-create'>Bulk Post Upload</a> (Comments.json)</li>";
  html += "<li><a href='/extension/popup.html'>View Records</a></li>";
  html += "<li><a href='/process-company-records'>Process Company Records</a></li>";
  html += "</ul>";
  return ctx.html(html);
});

// Serve static files from ./extension
app.get("/extension/*", async (ctx) => {
  return await ctx.env.ASSETS.fetch(ctx.req.url);
});
 
app.get("/extension_fill_form", async (ctx) => {
  console.log('extension_create_form'); 
  return ctx.json(ctx);
});


const {gpt} = require("./dist/extension/gptroutes");

app.post("/extension_fill_form", async (ctx) => {
  console.log('extension_create_form'); //fillFormsOptions
  const params = await ctx.req.json();
  const result = await gpt.extension_fill_form(params);
  return result;
});

 


// Dynamically load the 'record_company' and 'db' modules 
/*
const db = require("./dist/extension/db.js");


// Load the routes configuration
const routes = require("./dist/extension/dbroutes.js");

// Register API routes dynamically based on the routes configuration
routes.forEach(({ endpoint, method, action }) => {
  app[method](endpoint, async (ctx) => {
    const actionPath = action.split(".");
    const actionObject = actionPath[0] === "db" ? db : record_company;
    const actionMethod = actionPath[1];
    const params = ctx.req.method === "POST" ? await ctx.req.json() : ctx.req.params;
    const result = await actionObject[actionMethod](params);
    return ctx.json(result);
  });
});

// Endpoint for generating PDFs
app.post("/generate_pdf", async (ctx) => {
  const params = await ctx.req.json();
  const fileName = await record_company.generate_pdf(params);
  if (!fileName) {
    return ctx.text("PDF generation failed", 500);
  }
  return ctx.res.sendFile(new URL(fileName, ctx.req.url));
});

// Function to view database structure
app.get("/view-db-structure", async (ctx) => {
  const dbStructure = await db.viewDbStructure();
  return ctx.json(dbStructure);
});

// Static files serving from the ASSETS namespace
const files = ["popup.html", "sharedClient.js", "popup.js", "bookmark.js", "bookmark_init.js"];
files.forEach(file => app.get(`/${file}`, async (ctx) => {
  return await ctx.env.ASSETS.fetch(
    // retrieve this
  );
}));

*/

// Export the Hono app
export default app;
