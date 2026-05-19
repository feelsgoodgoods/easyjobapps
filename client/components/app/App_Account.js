import React, { useEffect, useCallback, useState } from 'react'
import { throttle } from 'lodash'
import { route } from '../../router.js'
import AccountLogin from './account/App_Account_Login.js'
import { r_endpoint } from '../../../shared/endpoints.js'
import AccountBio from './account/App_Account_Bio.js'
import { Popover } from './App_Popover.js'

// updates userData, set db[openaikey] && ls[openaikey]

function Account({ userData, setUserData, handleLogin, isLoggedIn }) {
  const [localOpenAiKey, setLocalOpenAiKey] = useState(userData.openaikey?.[0]?.text || 'noKeyOnStart')
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [creditsPopoverOpen, setCreditsPopoverOpen] = useState(false)

  // Memo userData and trigger updateUserData via handleInputChange only if userData changes as a result
  const updateUserData = useCallback(
    throttle(async (value) => {
      let tmp = [...(userData.openaikey || [])]
      if (!tmp[0]) {
        tmp[0] = {}
      }
      tmp[0].text = value
      const updatedUserData = {
        ...userData,
        openaikey: tmp,
      }
      await route({ openaikey: value }, '/userinfo_update_single', 'openaikey')
      setLocalOpenAiKey(value || '')
      setUserData(updatedUserData)
    }, 500),
    [userData],
  )

  useEffect(() => {
    setLocalOpenAiKey(userData.openaikey?.[0]?.text || '')
  }, [userData])

  const handleInputChange = (e) => {
    const { value } = e.target
    updateUserData(value)
  }

  const handlePurchase = async (purchaseAmount) => {
    try {
      let isChromeExt = window.origin.startsWith('chrome-extension')
      const response = await fetch(`${r_endpoint()}/stripe/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData?.username,
          purchase: purchaseAmount,
          sidepanel: !!isChromeExt,
        }),
      })
      let resp = await response.json()
      console.log('STRIPE PURCHASE RESPONSE', resp)

      if (response.ok) {
        // check if in extension or web
        chrome?.tabs?.create({ url: resp.url }) || (window.location.href = resp.url) // window.open(resp.url, '_blank');
      } else {
        console.error('Failed to create Stripe session')
      }
    } catch (error) {
      console.error('Failed to purchase credits:', error)
    }
  }

  let username = userData?.username
  let isGuestAcc = username?.startsWith('guest')
  let creditsBought = parseInt(userData?.creditsBought, 10) || 0
  let creditsUsed = parseInt(userData?.creditsUsed, 10) || 0
  let credits = creditsBought - creditsUsed

  let creditsView = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <b>Credits</b>: {credits}{' '}
        </div>
        <button className={'linkbtn'} onClick={() => setCreditsPopoverOpen(true)}>
          Get Credits
        </button>
      </div>

      {creditsPopoverOpen && (
        <Popover id="vieweditcontainer" title="Get Credits" onClose={() => setCreditsPopoverOpen(false)}>
          <p>Credits are used to interact with the AI.</p>
          <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
            <div>
              {' '}
              <button onClick={() => handlePurchase(300)}>Purchase $3 Credits</button>{' '}
            </div>
            <div>
              {' '}
              <button onClick={() => handlePurchase(500)}>Purchase $5 Credits</button>{' '}
            </div>
          </div>
        </Popover>
      )}
    </>
  )
  let apikeyView = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
        <b>OpenAI Key</b>
        <button className={'linkbtn'} onClick={() => setPopoverOpen(true)}>
          Set/Edit
        </button>
      </div>

      {popoverOpen && (
        <Popover id={`popover-apikey`} title="Set OpenAI Key" onClose={() => setPopoverOpen(false)}>
          <p>
            No need for credits when you <b>bring your own key</b>.
          </p>
          <b>
            <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noreferrer">
              OpenAI Key
            </a>
          </b>
          :
          <br />
          <input type="text" id="openaikey" name="openaikey" placeholder="Open AI Key" value={localOpenAiKey} onChange={handleInputChange} />
        </Popover>
      )}
    </>
  )
  // Signed In
  let signedInView = (
    <div>
      <div style={{ paddingLeft: '8px' }}>
        {creditsView}
        {apikeyView}
        <AccountBio userData={userData} setUserData={setUserData} />
      </div>
    </div>
  )

  let signedOutView = (
    <div>
      <div style={{ paddingLeft: '8px' }}>
        {creditsView}
        {apikeyView}
        <AccountBio userData={userData} setUserData={setUserData} />
      </div>
      <div style={{ paddingLeft: '8px' }}>
        <AccountLogin username={username} isLoggedIn={isLoggedIn} handleLogin={handleLogin} />
      </div>
    </div>
  )

  return (
    <div id="tabhelpcontainer">
      <div style={{ background: '#eee', color: '#333', padding: '8px' }}>
        <h1>Welcome {username || 'to easyjobapps'}!</h1>
        EasyJobApps is a free tool that uses AI to autofill job-forms with custom replies and uploads tailored resumes and cover letters made specifically for the job description.
        <br />
        <br />
      </div>
      <br />
      <h3 id="alertsetup"></h3>

      {isLoggedIn ? signedInView : signedOutView}
    </div>
  )
}

export default Account
