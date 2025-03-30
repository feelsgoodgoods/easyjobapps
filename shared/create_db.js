
import { queryDb } from './queryDb.js';

let createUserTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, 
        email TEXT,
        password TEXT
    )`);
} 

let createCreditsTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        description TEXT, 
        credits INTEGER DEFAULT 0,
        user_id TEXT
    )`);
} 

let createPaymentsTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        description TEXT, 
        credits INTEGER DEFAULT 0,
        user_id TEXT
    )`);
}

 
let createUserInfoTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS userinfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        text TEXT,
        title TEXT,
        label TEXT,
        user_id TEXT
    )`);
}
 

let createCompanyTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        status INTEGER DEFAULT 0,
        websiteUrl TEXT,
        companyName TEXT,
        user_id TEXT
    )`);
} 

let createJunkTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS junk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        user_id TEXT
    )`);
} 
  
let createPostsTable = async () => {  
  queryDb(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        status INTEGER DEFAULT 0,
        reject INTEGER DEFAULT 0, 
        meta TEXT DEFAULT '{}',
        text TEXT,
        jobTitle TEXT,
        link TEXT,
        resume TEXT,
        coverLetter TEXT,
        user_id TEXT,
        company_id INTEGER
    )`);
} 

let createSitemapTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS sitemaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT UNIQUE,
        generic INTEGER DEFAULT 0,
        specific INTEGER DEFAULT 0,
        board INTEGER DEFAULT 0,
        text TEXT,
        user_id TEXT,
        company_id INTEGER
      );`);
} 

let createExtractsTable = async () => {   
  queryDb(`CREATE TABLE IF NOT EXISTS extracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        type TEXT,
        status INTEGER DEFAULT 0,
        extract TEXT,
        link TEXT,
        text TEXT,
        user_id TEXT,
        company_id INTEGER,
        sitemap_id INTEGER DEFAULT 0,
        post_id INTEGER
    )`);
} 
createCreditsTable();
createPaymentsTable()
createUserTable(); 
createUserInfoTable();
createCompanyTable();
createJunkTable();
createPostsTable();
createSitemapTable();
createExtractsTable();

export {  };