let key = false; 
let cfpages = typeof process == 'undefined' 
let db = false;   
console.log('server:misc:START' )
if (!cfpages) {   
  console.log('server:misc:DEV' )
  // require("dotenv").config();
  // nodemailer = require("nodemailer");
  // const sqlite3 = require("sqlite3").verbose();
  // db = new sqlite3.Database("./resumeai.db", err => {
  //   if (err) {
  //     console.error(err.message);
  //   }
  //   console.log("Connected to the database.");
  // });
  key = process.env.YOUR_OPENAI_API_KEY; 
} 
else{ 
  console.log('server:misc:CF_PAGES' )    
}

function queryDb(sql, params = [], env={}) { 
  db = env.cfdb || db;
  key = env.cfkey || key;
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  queryDb,
  // viewDbStructure,
  // executeWorkerFunction
};

/*
async function sendEmail(recipientEmail, subject, text, html) {
  try {
    // Create a transporter
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.YOUR_GMAIL_EMAIL, // Use the senderEmail parameter
        pass: process.env.YOUR_GMAIL_PASSWORD
      }
    });

    // Setup email data
    let mailOptions = {
      from: `"Charles Karpati" <${process.env.YOUR_GMAIL_EMAIL}>`, // Use the senderName and senderEmail parameters
      to: recipientEmail, // Use the recipientEmail parameter
      subject: subject, // Use the subject parameter
      text: text, // Use the text parameter
      html: html // Use the html parameter
    };

    // Send the email
    let info = await transporter.sendMail(mailOptions);

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error occurred: %s", error.message);
  }
}

// Calls Worker JS
const { Worker } = require("worker_threads");
function executeWorkerFunction(fnName, data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./utils/record_scrape_worker.js");
    worker.on("message", response => {
      console.log("executeWorkerFunction response", response);
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    worker.postMessage({ fn: fnName, data: data });
  });
}

async function viewDbStructure(res) {
  let structure = {};

  // First, get all table names
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    let processedTables = 0;

    if (tables.length === 0) {
      res.json(structure);
      return;
    }

    tables.forEach(table => {
      db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        structure[table.name] = columns.map(col => col.name);

        processedTables++;

        if (processedTables === tables.length) {
          res.json(structure);
        }
      });
    });
  });
}
*/
 
