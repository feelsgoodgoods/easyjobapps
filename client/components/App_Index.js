import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import './../style.css' 
import Apply from './app/App_Apply.js'
import { Popover } from './app/App_Popover.js'
import AccountLogin from './app/account/App_Account_Login.js'
import AccountCredits from './app/account/App_Account_Credits.js'
import { route, showToast } from '../router.js'
import { r_endpoint } from '../../shared/endpoints.js'
import { jwtDecode } from 'jwt-decode'
import { set } from 'lodash'
import Tour from './app/App_Tour.js';

// console.log('App_Index.js') 

function App({user, post}) {
  const [tour, setTour] = useState(localStorage.getItem('tour'))
  const [showWelcome, setShowWelcome] = useState(tour!='never') 
  const [hideGdpr, setHideGdpr] = useState(localStorage.getItem('gdpr'))
  const [userData, setUserData] = useState(user)
  const [postData, setPostData] = useState(post)
  const [init, setInit] = useState(true)
  const [loginPopoverOpen, setLoginPopoverOpen] = useState(false)
  const [creditsPopoverOpen, setCreditsPopoverOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(user?.jwt)
  const [activeTab, setActiveTab] = useState(null) 


  useEffect( () => {
    localStorage.setItem('tour', tour)
    // console.log('tour', tour)
  }, [tour])

  useEffect( () => {
    // console.log('hideGdpr', hideGdpr, !!hideGdpr)
    !!hideGdpr && localStorage.setItem('gdpr', hideGdpr)  
  }, [hideGdpr])


  const handleTabClick = (tab) => {
    localStorage.setItem('activeTab', tab)
    setActiveTab(tab)
  }

  const handleLogin = async (jwt) => {
    console.groupCollapsed('handleLogin')  
    const newJWT = jwt || isLoggedIn // || await route(false, '/check-auth') // check uname 
    // console.log('AuthResp:', authResp)
    // Uses JWT cached in chrome storage userData
    if (newJWT) {    
      if (jwt) {     
        console.log('Logged In No Cache:') 
        let guestId = window.getLS('guest_id') 
        localStorage.setItem(guestId, JSON.stringify({ postData })) 
        setIsLoggedIn(true)  
        setChromeStorage('postData', {}) 
        saveGuestsEphemeralData()
        clearEphemeralPostData()  
        let user = jwtDecode(jwt || authResp.jwt)  
        window.userData = {
          jwt: jwt,
          username: user?.username,
          creditsUsed: user?.creditsUsed,
          creditsBought: user?.creditsBought,
        }
        await fetchUserData(window.userData) 
      }
      else if (isLoggedIn){
        console.log('Logged In From Cache:')

      }
    } else { 
      await handleLogout() // Use Guests Data
    }
    console.groupEnd()
  }

  const reloadApp = async () => {
    console.log('Reloading App', userData) 
    handleLogin()
  }

  // Guests LS data saved while user is logged in and refreshed on loggout.
  let epehemeralList = ['newresumeText', 'newcoverletterText', 'resumePdfBase64', 'coverletterPdfBase64', 'resumeMessage', 'coverletterMessage', 'resume_editLatex', 'coverletter_editLatex', 'updatePopoverresumeMessage', 'updatePopovercoverletterMessage', 'resumeId', 'coverletterId']

  // set LS ephemeralsList from guestEphemeral obj
  const setGuestEsphemeralData = () => {
    let guestEphemeral = localStorage.getItem('guestEphemeral')
    if (guestEphemeral) {
      console.log('Setting Guest Ephemeral Data', typeof guestEphemeral == 'string' ? JSON.parse(guestEphemeral) : guestEphemeral)
      const data = JSON.parse(guestEphemeral)
      for (let key in data) {
        localStorage.setItem(key, data[key])
      }
    }
  }
  const saveGuestsEphemeralData = () => {
    console.log('SAVE EPHEMERALS')
    let data = epehemeralList.map((key) => {
      return { [key]: localStorage.getItem(key) }
    })
    localStorage.setItem('guestEphemeral', JSON.stringify(data))
  }
  const clearEphemeralPostData = () => {
    console.log('CLEAR EPHEMERALS')
    epehemeralList.forEach((key) => {
      localStorage.removeItem(key)
    })
  }

  // Load guest postdata form data,
  const handleLogout = async () => {
    console.group('LOGOUT')  

    // Actually logging out, no cache.
    let postdata; 
    if (isLoggedIn) { console.log('Was Logged In')
      // const response = await route({}, '/logout')  
      let guest= window.getLS('guest')
      console.log('Guest:', typeof(guest), '>>>'+guest+'<<<')
      const guestData = JSON.parse( guest ) 
      postdata = guestData?.postData || {}  
      setGuestEsphemeralData()    

      setPostData(postdata)
      window.userData = {username: "guest" }  
      await fetchUserData()
    } 
    else{
      console.log('Already Logged Out')
    }  
 
    setIsLoggedIn(false) 
    console.groupEnd()
  }

  // Sets user data using DB and post.
  const fetchUserData = async (data={}) => { 

    // Fetch Data from DB
    let userdata = await (async () => {
          console.group('FetchUserData DB') 
          let userdata = {
            username: data?.username || userData.username,                                      
            jwt: data?.jwt,                     
            creditsBought: data?.creditsBought || '0',                          
            creditsUsed: data?.creditsUsed|| '0',    
            applySettings: (await route(false, '/userinfo_view/applysettings')) || [],
            bio: (await route(false, '/userinfo_view/bio')) || '',
            resumes: (await route(false, '/userinfo_view/resumetemplates')) || [],
            coverletters: (await route(false, '/userinfo_view/coverlettertemplates')) || [],
            openaikey: (await route(false, '/userinfo_view/openaikey')) || [],                                                           
          }
          console.groupEnd()
          return userdata
        })() 

    setUserData(userdata)
    return { userdata }
  }

  useEffect(() => {
    // Save a copy of guest into guest data backup 
    if (postData && postData.id) {
      console.log('Updating PostData', postData)
      if (window.getLS('username') == 'guest') {
        // localStorage.setItem('guest', JSON.stringify({ postData }))
      }
      postData.text && localStorage.setItem('postText', postData.text)
      window.setChromeStorage('postData', postData)
      window.postData = postData 
    }
    else{
      // console.log('SETTING PostData', postData)  
      if (window.getLS('username') == 'guest') {
        // localStorage.setItem('guest', JSON.stringify({ postData }))
      }
      postData.text && localStorage.setItem('postText', postData.text)
      window.setChromeStorage('postData', postData)
      window.postData = postData 
    }
  }, [postData])

  useEffect(() => {
    if(init){ setInit(false); return} 
    // console.log('setChromeStorage', userData)
    window.setChromeStorage('userData', userData)
    window.userData = userData // Used in router.js 
  }, [userData])

  // App starts here
  useEffect(() => {
    const initializeApp = async () => { 
      console.log('Initializing App', userData)  
      if (!window.getLS('guest')) {
        let guestData = !userData?.jwt ? userData : { postData: {} }
        localStorage.setItem('guest', JSON.stringify(guestData) ) //  + self.crypto.randomUUID().substring(0, 8)
      }   
      if ( !userData?.username ){ 
        userData.username = 'guest' //guest_id; 
        window.userData = userData;  
        setUserData(userData) 
      }       
      await handleLogin()

      setActiveTab(window.getLS('activeTab') || 'apply')

      // Ensure Login if Payment Success
      let stripeStatus = new URLSearchParams(window.location.search).get('stripe_status') 
      let stripeSessionId = new URLSearchParams(window.location.search).get('session_id') 
      let sidepanel = new URLSearchParams(window.location.search).get('sidepanel') 
      let username = new URLSearchParams(window.location.search).get('username') 
      if (stripeStatus == 'success') {
        window.showToast('Payment successful!')
        window.history.replaceState({}, document.title, window.location.pathname)
        // Stripe payment flow (more explicit guest handling)
        if (!window.loggedIn) {
          const data = await route({ username: username, password: username }, '/login') // log in as guest
          if (data.user) {
            console.log('Stripe guest logged in:', data)
            handleLogin()
          }
        }
        if (sidepanel === 'true') {
          console.log('Payment success sidepanel:', sidepanel, !!sidepanel, sidepanel === 'true')
          window.postMessage({ type: 'FROM_PAGE', text: 'reloadSidePanel' }, '*')
          window.location.replace(r_endpoint() + '/payment-success.html')
        }
      } 
    }
    window.setPostData = setPostData // content_popup.js
    window.reloadApp = reloadApp // content_popup.js
    window.handleTabClick = handleTabClick // content_popup.js
    initializeApp()  
  }, [])


  // check if is chrome extension
  let isEx = window.origin.startsWith('chrome-extension')  
  let welcomeView = showWelcome && (

    <Popover id={`popover-welcome`} 
            title={userData.username !='guest' ? `Welcome back ${userData.username}!` : 'Welcome to Easy Job Apps'}
            onClose={() => setShowWelcome(false)}
    >
      <div className="welcomeSplash">
        <div className="welcomeSplash__intro">
          <span className="welcomeSplash__eyebrow">{isEx ? 'Chrome side panel' : 'Web app and Chrome side panel'}</span>
          <p>
            Build a profile once, load the job you are viewing, and use Easy Job Apps to tailor resumes,
            cover letters, and job-form answers from the same app surface.
          </p>
        </div>

        <div className="welcomeSplash__workflow" aria-label="Easy Job Apps workflow">
          <div>
            <strong>1. Prepare</strong>
            <span>Add your resume, bio, AI key, credits, and application settings.</span>
          </div>
          <div>
            <strong>2. Load</strong>
            <span>{isEx ? 'Use Load Job while browsing a job page.' : 'Paste a job description in the web app, or use the extension side panel beside a job page.'}</span>
          </div>
          <div>
            <strong>3. Apply</strong>
            <span>{isEx ? 'Use Apply on supported forms to fill answers and upload generated PDFs.' : 'Generate tailored documents in the browser page, then use the Chrome side panel for form filling.'}</span>
          </div>
        </div>

        <div className="welcomeSplash__mode">
          <div>
            <strong>Browser page</strong>
            <span>Manual job loading, profile setup, document editing, and PDF generation.</span>
          </div>
          <div>
            <strong>Chrome side panel</strong>
            <span>Runs the same React page next to job sites and coordinates with content scripts.</span>
          </div>
        </div>

        <div className="welcomeSplash__actions">
          <button onClick={() => { setShowWelcome(false); setTour('never'); }} className='remove welcomeSplash__secondary' >
            Don't Show Again
          </button>
          <Tour setShowWelcome={setShowWelcome} className="welcomeSplash__primary" />
        </div>
      </div>
    </Popover>
  ) 

  let gdprView = !hideGdpr && ( 
    <div id="gdpr">
      <p>
        Data is stored locally and only transmitted for service-based activities.
      </p>
      <div>
        <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
        <a href="/terms-of-service.html" target="_blank">Terms of Service</a>
        <button onClick={() => setHideGdpr(Date.now())}>Okay</button>
      </div> 
    </div>
  )

  const toast = (msg) =>   <div id="toast" className="toast">{msg}</div> 
  const loading = (msg) => <div id="loading">{msg} <div className="spinner"></div></div>

  if (!userData) return <div> {toast('Loading...')} {loading('Loading...')} </div>

  let creditsBought = parseInt(userData?.creditsBought, 10) || 0
  let creditsUsed = parseInt(userData?.creditsUsed, 10) || 0
  let credits = creditsBought - creditsUsed
 
  let logoStyle = {fontSize: '1.5rem', padding: '1rem 0px 0px 1rem', fontWeight: 'bold'}
  let navBtnStyle = {float: 'right', marginLeft: '8px', padding: '1rem 4px 0px 0px'}
  navBtnStyle[':hover'] = { backgroundColor: '#0056b3' };

  return (
    <div id="resumetool">
      {welcomeView}
      {gdprView}
      {toast('Success!')} 
      {loading('Running Requested Task...')}

      <div id="topnav">
        <div style={logoStyle}>
          <b>Easy Job Apps</b> 
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <small>
            <button style={navBtnStyle} className={'linkbtn'} 
              onClick={() => setCreditsPopoverOpen(true)} 
              >
            <b>Credits</b>: {credits}{' '}
            </button>
          </small>
          <small>
            <button className="linkbtn" style={navBtnStyle} 
              onClick={ () => isLoggedIn ? handleLogout() : setLoginPopoverOpen(true)}  
              > 
              { isLoggedIn ? 'Sign Out' : 'Sign In' }
            </button>
          </small>
        </div>
      </div>

      {creditsPopoverOpen && (
        <Popover id="vieweditcontainer" title="Get Credits" onClose={() => setCreditsPopoverOpen(false)}>
          <AccountCredits userData={userData} setUserData={setUserData}/>
        </Popover>
      )}
      

      {loginPopoverOpen && (
        <Popover title="" onClose={() => setLoginPopoverOpen(false)}>
          <AccountLogin username={userData?.username} isLoggedIn={isLoggedIn} handleLogin={handleLogin} />
        </Popover>
      )}

      <Apply userData={userData} postData={postData} setPostData={setPostData} showToast={showToast} setUserData={setUserData} />
      { !hideGdpr && <div style={{marginBottom:isEx?'5rem':'3rem'}}></div>  }
    </div>
  )
}

(async () => {  
  let userData = await window?.getChromeStorage?.('userData') 
  let postData = await window?.getChromeStorage?.('postData') 
  if (!userData) { console.log('NO Chrome Storage Data');
    userData = {}
    postData = {}
  } 
  window.userData = userData  
  ReactDOM.render(<App user={userData} post={postData}/>, document.getElementById('root')) 
})()
 
window.origin.startsWith('chrome-extension') && document.body.setAttribute('data-chrome-extension', 'true')

export default App

// https://easyjobapps.com/?stripe_status=success&sidepanel=true&username=guest_fec6eb96&session_id=cs_test_a1eH0FvU1FfBZj6d54j3VEaRVvqraSVJVf61FZcMFI016uipVH3g1U4aQT









// Updates Login Status (window, ls, react). Returns Auth Resp
// sets LS[loggedIn, jwt, uname, creditsUsed, creditsBought]
// returns AuthResp[isLoggedIn, user]

// checks for auth then set the loginstatus. 
// - sets jwt user vars if logged in and fetch data
// - if freshly loggedin, save the current guest data
// otherwise se uname to guest and handle Logout.









// Global Window Vars
// window.logkeys(),  [getLS, reloadApp, getChromeStorage, setChromeStorag, showToast, passToContent actions=["getPost", "apply"(user,postdata)]]
// window.[loggedIn, userData, postdata]

//
// window.userData = window.getChromeStorage
// ls[uname, guestId]
// checkAuth sets window.loggedIn, ls[uname, creditsUsed, creditsBought] and sends sw[jwt]
// fetchDat uses window.loggedIn, ls[uname, creditsUsed, creditsBought, postdata] and Server.DB (uname) to
// - - sets ls[bio,resumes,coverletters,openaikey] and
// - - window.userData, window.setChromeStorag
// - - sw[r_endpoint]
// ls[activeTab], window.showToast,
//

// ROUTER
// Uses window.userData[uname, openaikey] to body
// CheckAuth router method uses session not jwt.

// APP_ACCOUNT
// updates window.userData, setChromeStorag, set db[openaikey] && ls[openaikey]

// APP_LOGIN
// window.showToast, handleLogin

// APP_SETTINGS
// ls[newresumeText, newcoverletterText, resumeId, coverletterId, postdata]

// APP_APPLY

// reloadApp -> handleLogin -> (checkAuthStat, fetchDat)
// checkAuthStat = sets LS[loggedIn, jwt, uname, creditsUsed, creditsBought]
// handleLogin = getLS guistId, set LS ephemeralsList from guestEphemeral obj

// handleLogout



