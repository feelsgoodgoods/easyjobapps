// index_login.js

// Description:
// Successful registrations updates users.JSON and DB.users.
// - - createNewUser()  
// - - db.signup() - INSERT INTO users (email, password, id) => body.[email<google only>, password, username]
//
// Strategies are authentication middleware. 
// Passport strategies pass result to serializeUser and deserializeUser which returns {id, type}
// createNewUser called in [/signup, google/strategy Callback, metamask/ strategy Callback] routes
//  

import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';

import bcrypt from 'bcrypt';
import ethUtil from 'ethereumjs-util';
import { Strategy as PassportStrategy } from 'passport-strategy';
import { app, createNewUser, jwtAuth, users } from './index_middleware.js'; 
import { db } from '../shared/db.js'; 

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs'; 
import {r_endpoint} from '../shared/endpoints.js';
const repoEnvPath = path.resolve(process.cwd(), '.env');
const adjacentEnvPath = path.resolve(process.cwd(), '../easyjobapps-staging/.env'); 
const envPath = fs.existsSync(repoEnvPath) ? repoEnvPath : adjacentEnvPath; 
dotenv.config({ path: envPath });  

let url = r_endpoint(); 

// Logout route
app.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    db.logout(req.user);
    return res.json({ success: true, data: { message: 'Logout Signup successful', user: false } });
  });
});

// Returns USER.JSON data to the user if logged in via session as a JWT.
app.get('/check-auth', jwtAuth, (req, res) => { 
  console.log('check-auth - USER LOGGED IN:', req.user); 
  // user is user object from deserializeUser. req.login already called and object put into the session store.
  res.json({
    status: "success", 
    data: {
      isLoggedIn: req.user ? true : false,
      jwt: req.jwt,
    }
  }); 
});


// called by login to serialize the user into the session store. 
// Invoked by req.logIn passing authenticated user (returend from strategy).
passport.serializeUser((user, done) => { 
  if (user.googleId) {
    done(null, { id: user.googleId, type: 'google' });
  } else if (user.username) {
    done(null, { id: user.username, type: 'local' });
  } else if (user.address) {
    done(null, { id: user.address, type: 'metamask' });
  } else {
    done(new Error('Unknown user type'));
  }
}); 

// called on each subsequent request, given the serialized user from the session store, get the user object.
passport.deserializeUser((serializedUser, done) => { 
  let s = serializedUser
  let user; 
  if (s.type === 'google') {
    user = users.find(u => u.googleId === s.id);
  } else if (s.type === 'local') { 
    user = users.find(u => u.username === s.id);
  } else if (s.type === 'metamask') {
    user = users.find(u => u.address === s.id);
  }
  if (user) {
    done(null, user);
  } else {
    console.log('User not found:', serializedUser);
    let resp = { success: false, data: { message: 'User not found' } };
    done(resp, null);
  }
});

// let token; 
// token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);    
// if (!token) return res.status(401).json({ success: false,  data: { error: 'Unauthorized' } });
// jwt.verify(token, process.env.EASYJOBAPPS_JWT_SECRET, (err, decoded) => {
//   if (err) { return res.status(401).json({ success: false,  data: { error: 'Unauthorized' } }); }
//   req.user = decoded;
//   next();
// }); 

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract token from Authorization header
  secretOrKey: process.env.EASYJOBAPPS_JWT_SECRET, // Secret used for signing the token
};

passport.use(new JwtStrategy(jwtOptions, (decodedJwt, done) => { 
  // Serialization happens on successfull login. 
  // Deserialization here happens on each AuthJWT.
  console.log("JWT Middleware: Decoded:", decodedJwt);
  // if decoded successfully, return the user object
  return done(null, decodedJwt);
  // done(null, false, { message: 'Invalid token' });
})); 

passport.use(new LocalStrategy(  // No additional args need be passed
  async (username, password, done) => { // Passport configuration for Local Strategy // values automatically extracted fro req.body
    const user = users.find(u => u.username === username); 
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    } 
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return done(null, false, { message: 'Incorrect password.' });
    } 
    return done(null, user);
  }
));

app.post('/login', (req, res, next) => { 
  passport.authenticate('local', (err, user, info) => {
    console.log('Passport authenticated:', req.body); // , { err, user, info }
    if (err) { return res.status(500).json({ success: false, data: { message: 'Internal server error'} }); }
    if (!user) { return res.json({ success: true, data: { message: info?.message || 'Please Check Your Credentials.', user: false } }); }
    // Establishes a session
    // req.logIn(user, (err) => {  
    //   if (err) { return res.status(500).json({ success: false, data: { message: 'Internal server error' } }); } 
    //   return res.json({ success: true, data: { message: 'Login successful', user: token } });
    // });
    const token = generateJwtToken(user);
    return res.json({ success: true, data: { message: 'Login successful', jwt: token } });
  })(req, res, next);
});

// Signup Route
app.post('/signup', async (req, res, next) => {
  console.log('Signup request:');
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, data : { message: 'Username and password are required' } });
  }
  if (users.find(user => user.username === username)) { 
    return res.json({ success: true, data: { message: 'Username already exists' } }); 
  }
  const hashedPassword = await bcrypt.hash(password, 10); 
  let user = { username, password: hashedPassword };  
  createNewUser(user);
  let dbUser = db.signup(user);
  return res.json({ success: true, data: { message: 'Signup successful', user: !!dbUser } });
});
 


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 



// Passport configuration for Google Strategy 
// Additional args that need to be passed no in req.body.
let googleConfig  = { clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${url}/auth/google/callback` 
}
passport.use(new GoogleStrategy(googleConfig,
  (accessToken, refreshToken, profile, done) => { // Taken from Req Body
    const googleId = profile.id;
    let user = users.find(u => u.googleId === googleId);
    if (!user) {
      user = {
        username: `google_${googleId}`,
        googleId: googleId,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        photos: profile.photos.map(photo => photo.value),
      }; 
      createNewUser(user);
      db.signup(user);
    }
    return done(null, user);
  }
));


// Google Login Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google login callback route
app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/popup.html'
}), (req, res) => {
  const token = generateJwtToken(req.user); 
  res.redirect(`/popup.html#google-auth-success?user=${token}`);
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


//
// Define a special Passport handler for MetaMask
// 
class MetaMaskStrategy extends PassportStrategy {
  constructor(options, verify) {
    super();
    this.name = 'metamask';
    this.verify = verify;
  }

  authenticate(req, options) {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return this.fail({ message: 'Missing credentials' }, 400);
    }

    try {
      const messageBuffer = Buffer.from(message);
      const messageHash = ethUtil.hashPersonalMessage(messageBuffer);
      const signatureBuffer = ethUtil.toBuffer(signature);
      const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
      const publicKey = ethUtil.ecrecover(
        messageHash,
        signatureParams.v,
        signatureParams.r,
        signatureParams.s
      );
      const recoveredAddress = ethUtil.pubToAddress(publicKey).toString('hex');

      console.log('Recovered Address:', recoveredAddress);

      if (recoveredAddress.toLowerCase() === address.toLowerCase().slice(2)) {
        this.verify(address, (err, user, info) => {
          if (err) { return this.error(err); }
          if (!user) { return this.fail(info); }
          this.success(user, info);
        });
      } else {
        console.error('Invalid signature for address:', address);
        return this.fail({ message: 'Invalid signature' }, 401);
      }
    } catch (error) {
      console.error('Error during MetaMask authentication:', error);
      return this.error(error);
    }
  }
}
 

// Use the MetaMask strategy
passport.use(new MetaMaskStrategy({}, (address, done) => {
  let user = users.find(user => user.address === address);
  if(!user) {
    user = { username: `metamask_${address.slice(0, 8)}`, address };
    createNewUser(user);
    db.signup(user);
  }
  done(null, user);
}));

// MetaMask Login Route 
app.post('/metamask/login', (req, res, next) => {
  passport.authenticate('metamask', (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, data : { message: 'Internal server error'} });
    }
    if (!user) {
      return res.status(401).json({ success: false, data : { message: 'MetaMask authentication failed'} });
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.status(500).json({ success: false, data : { message: 'Internal server error' }});
      } 
      const token = generateJwtToken(user);
      return res.json({ success: true, data : { message: 'MetaMask login successful', user: token } });
    });
  })(req, res, next);
});


// const token = generateJwtToken(req.user);
const generateJwtToken = (user) => {
  console.log('Generating JWT token for user:', user);
  const payload = {
    username: user.id || user.username || user.googleId || user.address,  // Dynamically select the identifier
    type: user.googleId ? 'google' : user.username ? 'local' : 'metamask',  // Identify the type of login
    creditsBought: user.creditsBought || 0,  // Add creditsBought from the user object, default to 0
    creditsUsed: user.creditsUsed || 0,  // Add creditsUsed from the user object, default to 0s
  };
  const secretKey = process.env.EASYJOBAPPS_JWT_SECRET;
  const token = jwt.sign(payload, secretKey, { expiresIn: '9h' });  // Token expires in 1 hour
  return token;
};
