import React, { useState, useEffect } from 'react';
import detectEthereumProvider from '@metamask/detect-provider'; 
import {route} from '../../../router.js';
import { set } from 'lodash';

function AccountLogin({ handleLogin, username }) {
  const [loginUsername, setLoginUsername] = useState(username);
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const loginWithSession = async () => {
    if (!loginUsername || !loginPassword) {
      window.showToast('Username and password cannot be empty');
      return;
    } 
    console.log('Handle Login', loginUsername)
    let resp = await route({ username: loginUsername, password: loginPassword }, '/login');  
    let jwt = resp.jwt;
    if (jwt) {
      window.showToast('Login successful'); 
      handleLogin(jwt); 
    }  
  };

  const handleSignup = async () => {
    if (!signupUsername || !signupPassword) {
      window.showToast('Username and password cannot be empty');
      return;
    }

    try {
      console.log('SIGNUP', signupUsername, signupPassword)
      const data = await route({ username: signupUsername, password: signupPassword }, '/signup');
      console.log('SIGNUP DATA', data)
      if (data.user) {
        window.showToast('Signup successful. Please login...'); 
        setIsSignup(false);
        setLoginUsername(signupUsername);
        setLoginPassword(signupPassword);  
      } else {
        window.showToast('Signup failed: ' + data.message);
      }
    } catch (error) {
      console.error('Error during signup:', error);
    }
  };

  const loginWithMetaMask = async () => {
    const provider = await detectEthereumProvider();
    if (provider) {
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        const message = `Login to Crypto Payment App: ${new Date().toISOString()}`;
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        });

        const response = await route({ address, signature, message }, '/metamask/login'); 
        const data = await response.json();
        if (data.success) {
          handleLogin(data.jwt)
          console.log('MetaMask login successful for user:', address);
        } else {
          window.showToast('MetaMask login failed. Please ensure you are signed in to your wallet and try again.');
        }
      } catch (error) {
        console.error('Error during MetaMask login:', error);
        window.showToast('MetaMask login failed');
      }
    } else {
      window.showToast('MetaMask not detected! Please install MetaMask and try again.');
    }
  };

  return (
    <div className="container">
      {isSignup ? (
        <div id="signupContainer">
          <h2>Signup</h2>
          <input 
            type="text"
            value={signupUsername}
            onChange={(e) => setSignupUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={handleSignup} 
                  style={{ marginRight: '10px' }}>Signup</button>
          <button onClick={() => setIsSignup(false)}>Back to Login</button>
        </div>
      ) : (
        <div id="loginContainer">
          <h2>Login <small style={{fontSize:'.8rem'}}>(optional)</small></h2>
          <input
            type="text"
            value={loginUsername} 
            onChange={(e) => setLoginUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Password"
          />
          <div style={{ marginTop: '10px' }}>
            <button onClick={loginWithSession} style={{ marginRight: '10px' }}>Login</button>
            <button onClick={() => setIsSignup(true)} style={{ marginRight: '10px' }}>Signup</button>
            <button onClick={loginWithMetaMask} style={{ marginRight: '10px' }}>Login with MetaMask</button>
            <a href="/auth/google"><button>Login with Google</button></a>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountLogin;