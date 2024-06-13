-- npx wrangler d1 create autoapplydb
-- npx wrangler d1 execute autoapplydb --local --file=./dist/extension/schema.sql
-- npx wrangler d1 execute autoapplydb --local --command="PRAGMA table_info('extracts');"

CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    tempToken TEXT,
    uuid TEXT
);

CREATE TABLE IF NOT EXISTS userinfo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
    text TEXT,
    title TEXT,
    label TEXT,
    company_id INTEGER DEFAULT 0,
    post_id INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
    status INTEGER DEFAULT 0,
    websiteUrl TEXT,
    companyName TEXT
);

CREATE TABLE IF NOT EXISTS junk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
    status INTEGER DEFAULT 0,
    reject INTEGER DEFAULT 0,
    company_id INTEGER,
    meta TEXT DEFAULT '{}',
    text TEXT,
    jobTitle TEXT,
    link TEXT,
    resume TEXT,
    coverLetter TEXT
);

CREATE TABLE IF NOT EXISTS sitemaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT UNIQUE,
    generic INTEGER DEFAULT 0,
    specific INTEGER DEFAULT 0,
    board INTEGER DEFAULT 0,
    company_id INTEGER,
    text TEXT
);

CREATE TABLE IF NOT EXISTS extracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    sitemap_id INTEGER DEFAULT 0,
    post_id INTEGER,
    dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
    type TEXT,
    status INTEGER DEFAULT 0,
    extract TEXT,
    link TEXT,
    text TEXT
);
