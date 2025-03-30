// index_middleware.js

// 
// Description:
// - Initializes Express app and configures it w the needed middlewares. 
// - Authenticates and handles 'sessions' using json file
// - - (isAuthneticated, createNewUser, createUserPayment) 

import express from 'express';
import session from 'express-session';
import fs from 'fs'; 
import passport from 'passport'; 
import dotenv from 'dotenv'; 
import bodyParser from 'body-parser';
import cors from 'cors';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import jwt from 'jsonwebtoken';

dotenv.config(); 
export const app = express();

app.use(cors({
  origin: [ 
    'http://localhost:3001'  , 'http://localhost:3002', 'http://easyjobapps.com', 'http://staging.easyjobapps.com', 'http://getfrom.net',
    'https://localhost:3001' , 'https://localhost:3002', 'https://easyjobapps.com', 'https://staging.easyjobapps.com', 'https://getfrom.net'
  ],
  optionsSuccessStatus: 200
})); 

// Increase the limit for raw body parsing
app.use(bodyParser.raw({ limit: '5mb' }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(express.json());

// Additional Routes  
// app.get("/view-db-structure", (req, res) => viewDbStructure(res));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true})); 


//
// Passport fs session stuff
//

// Session middleware should be initialized before passport's session handling
app.use(session({
  secret: process.env.SESSION_SECRET || '1kdf93;d05jg6539sk120f7665jg763oshg5jfdnw0du2mvc.xz/vmw/vnb8fdmn34.x02.tnb7c0',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using https
}));

app.use(passport.initialize());
app.use(passport.session());
 

// Load users data
const dataFilePath = './server/users.json';

export let users = [];

if (fs.existsSync(dataFilePath)) { 
  const rawData = fs.readFileSync(dataFilePath); 
  users = JSON.parse(rawData); 
} else {
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));
}

// FS Function to write new user to users.json
export const createNewUser = async (user) => { 
  users.push({ 
    payments: [], 
    creditsBought: 0, 
    creditsUsed: 0, 
    ...user // username, bcrypt-10 password
  }); 
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));  
  console.log('\x1b[36m%s\x1b[0m', 'WRITING NEW USER TO USERS OBJECT') 
};
  


// FS Function to write new payment to users.json. May create new user if not found.
export const createUserPayment = async (paymentRecord) => {
  console.log('\x1b[36m%s\x1b[0m', 'index_middleware: Create User Payment');
  let { username, guestPasswordHash, ...record } = paymentRecord;
  let user = users.find(user => user.username === username);
  if (!user){ 
    user = { 
      payments: [], 
      creditsBought: 0, 
      creditsUsed: 0, 
      username, 
      password: guestPasswordHash 
    }; 
    users.push(user);
  } 
  user.creditsBought += record.credits;
  user.payments.push(record);
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));   
};


// isAuthenticat middleware to protect routes. Session Based Check
// export function isAuthenticated(req, res, next) {   
//   console.log('\x1b[36m%s\x1b[0m', '- req.isAuthentic()', req.isAuthenticated());
//   if (req.isAuthenticated()) { 
//     return next();
//   } 
//   res.json({ status: "success", data: { isLoggedIn: false, errorType: 'login', error: 'User not logged in.' } });
// }

// Middleware function to authenticate requests using JWT from either Authorization header or request body
export const jwtAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, decoded) => {
    let data = { success: true, data: {isLoggedIn: false, errorType: 'login', error: 'User not logged in.' } };
    if (err) return res.json(data);
    if (!decoded) return res.json( data); 
    req.user = decoded;  
    req.jwt = ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    next();
  })(req, res, next);
}; 
// let token; 
// token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);    
// if (!token) return res.status(401).json({ success: false,  data: { error: 'Unauthorized' } });
// jwt.verify(token, process.env.EASYJOBAPPS_JWT_SECRET, (err, decoded) => {
//   if (err) { return res.status(401).json({ success: false,  data: { error: 'Unauthorized' } }); }
//   req.user = decoded;
//   next();
// }); 

// checkUserCredits middleware
export async function checkUserCredits(req, res, next) {
  try {
    const oaikey = req.body.oaikey;
    const userId = req.user?.username || req.user?.googleId || '';
    const user = users.find(u => u.username === userId);

    if (!user) {
      return res.status(400).json({ success: false,  data: { error: 'User not found' } });
    }

    // Calculate available credits: `creditsBought - creditsUsed`
    const availableCredits = user.creditsBought - user.creditsUsed;

    console.log(`Checking credits for user ${userId}...`, { availableCredits, creditsBought: user.creditsBought, creditsUsed: user.creditsUsed });

    // Check if the user has enough credits
    if (!oaikey && availableCredits <= 0) {
      return res.status(403).json({ success: false,  data: { errorType:'credits', error: 'Insufficient credits...' } });
    }

    console.log(`User ${userId} has ${availableCredits} credits remaining.`);
    next();
  } catch (error) {
    console.error('Error in credit check middleware:', error);
    res.status(500).json({ success: false,  data: { error: 'Internal server error' } });
  }
}

// Function to update users.json (server-side only)
export const updateUserCredits = async (userId, tokensUsed) => {
  const user = users.find(u => u.username === userId);
  if (!user) throw new Error('User not found');

  // Increase the `creditsUsed` by the amount of tokens used
  user.creditsUsed += tokensUsed;

  // Save updated data back to users.json
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));
  console.log(`Updated users.json for user ${userId}, tokens used: ${tokensUsed}, total credits used: ${user.creditsUsed}`);
};