// http://localhost:3000/populate-database
// http://localhost:3000/view-db-structure
// https://news.ycombinator.com/item?id=37351667
// let comments = [...document.querySelectorAll('.comment .c00')].map(comment => comment.innerHTML);
/*
UPDATE company_posts
SET company_post = REPLACE(company_post, '</p><div class="reply">        <p><font size="1">
</font>
</p></div>', '');
*/
/*
let comments = [...document.querySelectorAll('.comment .c00')].map(comment => {
    // Clone the comment node
    let clone = comment.cloneNode(true);

    // Remove all elements with class 'reply' from the clone
    clone.querySelectorAll('.reply').forEach(reply => reply.remove());

    // Return the innerHTML of the modified clone 
    return clone.innerHTML;
});
*/

// const bcrypt = require("bcryptjs");
const port = 3001;
const express = require("express");
const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors());

// Step -1 - Main Menu
app.get("/", (req, res) => {
  let html = "<h1>Hacker News Posts</h1>";
  html += "<p>Endpoints:</p>";
  html += "<ul>";
  html += "<li><a href='http://localhost:3001/posts-bulk-create'>Bulk Post Upload</a> (Comments.json)</li>";
  html += "<li><a href='http://localhost:3001/companys-view'>View Records</a></li>";
  html += "<li><a>process-company-records</a></li>";
  html += "</ul>";
  res.send(html);
});

const path = require("path");
const files = ["popup.html", "sharedClient.js", "popup.js", "bookmark.js", "bookmark_init.js"];
files.forEach(file => app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, "extension", file))));

const record_company = require("./extension/gpt");
const db = require("./utils/db");
const routes = require("./extension/routes");

// Simple method to routes
routes.forEach(({ endpoint, method, action }) => {
  app[method](endpoint, async (req, res) => {
    const actionPath = action.split(".");
    const actionObject = actionPath[0] === "db" ? db : record_company;
    const actionMethod = actionPath[1];
    const result = await actionObject[actionMethod](method === "post" ? req.body : req.params);
    res.status(200).send(result);
  });
});

app.post("/generate_pdf", async (req, res) => {
  const fileName = await record_company.generate_pdf(req.body);
  if (!fileName) return res.status(500).send("PDF generation failed");
  res.sendFile(path.resolve(__dirname, fileName), err => err && console.error(err) && res.status(500).end());
});

app.listen(port, () => console.log(`Server started on http://localhost:${port}`));

const { viewDbStructure } = require("./utils/misc");
app.get("/view-db-structure", (req, res) => viewDbStructure(res));
