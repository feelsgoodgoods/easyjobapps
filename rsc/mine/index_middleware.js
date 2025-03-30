// index_middleware.js

import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import passport from 'passport';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { queryDb } from './misc.js'; // CREATE THE VERY FIRST NEW USER
import bodyParser from 'body-parser';
// import database 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const port = 3001;
export const app = express();

// Increase the limit for raw body parsing
app.use(bodyParser.raw({ limit: '5mb' }));

// Then add these lines
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(express.json());

// Session middleware should be initialized before passport's session handling
app.use(session({
  secret: process.env.SESSION_SECRET || '1kdf93;d05jg6539sk120f7665jg763oshg5jfdnw0du2mvc.xz/vmw/vnb8fdmn34.x02.tnb7c0',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using https
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware for logging requests
app.use((req, res, next) => {
  console.log('Request Time:', Date.now(), 'Request Type:', req.method, 'Endpoint:', req.originalUrl); 
  next();
}); 

// Load users data
const dataFilePath = './users.json';
export let users = [];
if (fs.existsSync(dataFilePath)) {
  const rawData = fs.readFileSync(dataFilePath);
  users = JSON.parse(rawData);
} else {
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));
}

export const createNewUser = async (user) => { 
  users.push({ payments: [], ...user }); 
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));  
  let sql = "INSERT INTO users (email, password, id) VALUES (?, ?, ?)";
  let params = [user.email, user.password, user.username || user.googleId];
  queryDb(sql, params); 
  let dbUser = await queryDb("SELECT * FROM users WHERE id = ?", [user.username || user.googleId]);
  console.log('Created New dbUser:', dbUser); 
  return dbUser;
};

// isAuthenticated middleware to protect routes
export function isAuthenticated(req, res, next) { 
  let specialConditions = ['/check-auth', '/login', '/signup']; 
  if (specialConditions.includes(req.originalUrl)) {
    return next();
  }
  // console.log('req.isAuthenticated()', req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: 'You are not authenticated' });
}
