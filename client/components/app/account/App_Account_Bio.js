import React, { useState, useEffect, useRef, useCallback } from 'react';
import { throttle } from 'lodash';
import { route, showToast } from '../../../router.js';
import { Popover } from '../App_Popover.js';

function AccountBio({ userData, setUserData }) {
  const defaultBio = `
First Name:
Middle Name:
Last Name:
Email Address:
Phone:
Country:
State:
County:
City:
Postal Code:
Address Line 1:
Tax District:
Preferred Location:
Are you 18+?:
Are you authorized to work in the US?:
Will you need employer-based sponsorship?: 
Link 1:
Do you have a disability?:
Diversity Information:
Select the races you identify with:
Gender:
Military Spouse:
Military Status:
Protected Veteran Status:
Anything else we should know?:
`
  const [localBio, setLocalBio] = useState(userData?.bio?.[0]?.text || defaultBio);
  const textareaRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    if (cursorPosition !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [cursorPosition, localBio]);

  useEffect(() => { 
    setLocalBio(userData.bio?.[0]?.text || defaultBio);
  }, [userData]);

  const handleInputChange = useCallback(
    throttle(async (e) => {
      console.log('userData', userData);
      const { name, value } = e.target;
      let tmp = userData?.bio
      if(!tmp[0]){ tmp[0] = {} }
      tmp[0].text = value 
      // let val = JSON.stringify(tmp); 
      const updatedFormData = { ...userData, [name]: tmp }; 

      await route({ [name]: value }, "/userinfo_update_single", "bio"); 
      setUserData(updatedFormData);
    }, 500),
    [userData]
  );

  const handleBioChange = (e) => {
    const { value } = e.target;
    setLocalBio(value);
    setCursorPosition(e.target.selectionStart);
    handleInputChange(e);
  };
  

  // console.log('userData', userData);
  return (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'8px' }}>
      <b>Bio</b>
      <button className={'linkbtn'} onClick={() => setPopoverOpen(true)}>Edit</button>
    </div>

    {popoverOpen && 
    <Popover id={`popover-apikey`} title="Set OpenAI Key" onClose={() => setPopoverOpen(false)}>
      <div style={{ paddingLeft: '8px' }}> 
        <form> 
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <div style={{ width: 'fit-content', width: '-webkit-fill-available' }}>
            This will be used to fill out job application forms.
            </div>
          </div> 
          <textarea 
          ref={textareaRef}
          id="bio"
          name="bio"
          placeholder="" 
          style={{ height: '40vh'}}
          value={localBio}
          onChange={handleBioChange}
        />  
        </form>
        <br/>
      </div>
    </Popover>
    }
  </>
  )
}

export default AccountBio;