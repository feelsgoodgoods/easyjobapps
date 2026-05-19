import React, { useState, useEffect, useCallback } from 'react';
import { throttle } from 'lodash'
import { r_endpoint } from '../../../../shared/endpoints.js'

function AccountCredits({ userData, setUserData }) { 
  const [localOpenAiKey, setLocalOpenAiKey] = useState(userData.openaikey?.[0]?.text || 'noKeyOnStart') 
  const [popoverOpen, setPopoverOpen] = useState(false);

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
  const handleInputChange = (e) => {
    const { value } = e.target
    updateUserData(value)
  }

  const handleOpenAiInputChange = (e) => {
    setLocalOpenAiKey(e.target.value);
  };

    useEffect(() => {
      setLocalOpenAiKey(userData.openaikey?.[0]?.text || '')
    }, [userData])

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

  return (
    <div>
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

<p>
No need for credits when you <b>bring your own key</b>.
</p>
<p> 
  <b> 
    <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noreferrer">
      OpenAI Key: 
    </a> 
  </b>  
</p> 
<input type="text" id="openaikey" name="openaikey" placeholder="Open AI Key" value={localOpenAiKey} onChange={handleInputChange} />


    </div>
  );
}



 export default AccountCredits;