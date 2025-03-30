import React, { useState } from 'react'; 
import { route } from '../../../router.js';
import { Popover } from '../App_Popover.js'
import AccountBio from '../account/App_Account_Bio.js'

let defaultS = {
  ignoreCompanyList: '',
  ignoreTitleList: '',
  messageToRecruiter: `Generate a short message to a recruiter on LinkedIn's chat feature (30 words max, 10-20 is ideal). 
Simply tell the recruiter that you have submitted a resume and would like to speak with them.
`,
  formFillingInstructions: `- Make educated guesses when needed and creative writing is allowed
- For text fields, provide either relevant information or a sensible placeholder if unsure.
- Do not lie about technical skills or matters of fact.
`,
  messageRecruiter: false,
  continuousMode: false,
}

function SettingsTab({ userData, setUserData }) {
  let settings = userData.applySettings?.[0]?.text 
  settings = settings && JSON.parse(settings) || {} 

  const [ignoreCompanyList, setIgnoreCompanyList] = useState(settings.ignoreCompanyList || defaultS.ignoreCompanyList)
  const [ignoreTitleList, setIgnoreTitleList] = useState(settings.ignoreTitleList || defaultS.ignoreTitleList)
  const [messageToRecruiter, setMessageToRecruiter] = useState(settings.messageToRecruiter || defaultS.messageToRecruiter)
  const [formFillingInstructions, setFormFillingInstructions] = useState(settings.formFillingInstructions || defaultS.formFillingInstructions)
  const [messageRecruiter, setMessageRecruiter] = useState(!!settings?.messageRecruiter)
  const [continuousMode, setContinuousMode] = useState(!!settings?.continuousMode)
 
  const [formInstructionsPopoverOpen, setFormInstructionsPopoverOpen] = useState(false)
  const [skipCompanyPopoverOpen, setSkipCompanyPopoverOpen] = useState(false)
  const [skipTitlePopoverOpen, setSkipTitlePopoverOpen] = useState(false)
  const [messageRecruiterPopoverOpen, setMessageRecruiterPopoverOpen] = useState(false);

  const handleSave = async () => { 
    const applySettings = { 
      ignoreCompanyList,
      ignoreTitleList,
      messageRecruiter,
      messageToRecruiter,
      formFillingInstructions,
      continuousMode,
    } 
    const updatedUserData = {
      ...userData,
      applySettings: applySettings
    } 
    await route({ 'applysettings': JSON.stringify(applySettings) }, "/userinfo_update_single", "applysettings");  
    setUserData(updatedUserData) 
  }

  const viewFormInstructions = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ marginBottom: '1em' }}>
          <b>Form Filling Instructions</b>: 
        </div>
        <button className={'linkbtn'} onClick={() => setFormInstructionsPopoverOpen(true)}>
          Edit
        </button>
      </div>

      {formInstructionsPopoverOpen && (
        <Popover id="formInstructionsPopover" title="Edit Form Filling Instructions" onClose={() => setFormInstructionsPopoverOpen(false)}>
          <textarea 
            value={formFillingInstructions} 
            onChange={(e) => setFormFillingInstructions(e.target.value)} 
            style={{ width: '100%', height: '100px' }} 
          />
        </Popover>
      )}
    </>
  );

  const viewSkipCompany = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <b>Skip Companies</b>:
        </div>
        <button className={'linkbtn'} onClick={() => setSkipCompanyPopoverOpen(true)}>
          Edit
        </button>
      </div>

      {skipCompanyPopoverOpen && (
        <Popover id="skipCompanyPopover" title="Ignored Companies" onClose={() => setSkipCompanyPopoverOpen(false)}>
          Please enter a list of companies to ignore separated by commas.
          <textarea 
            value={ignoreCompanyList} 
            onChange={(e) => setIgnoreCompanyList(e.target.value)} 
            style={{ width: '100%', height: '100px' }} 
          />
        </Popover>
      )}
    </>
  );

  const viewSkipTitle = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <b>Skip Job Titles</b>:
        </div>
        <button className={'linkbtn'} onClick={() => setSkipTitlePopoverOpen(true)}>
          Edit
        </button>
      </div>

      {skipTitlePopoverOpen && (
        <Popover id="skipTitlePopover" title="Ignore Job Titles" onClose={() => setSkipTitlePopoverOpen(false)}>
          List of job titles to ignore separated by commas.
          <textarea 
            value={ignoreTitleList} 
            onChange={(e) => setIgnoreTitleList(e.target.value)} 
            style={{ width: '100%', height: '100px' }} 
          />
        </Popover>
      )}
    </>
  );

  const viewMessageRecruiter = (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        cursor: messageRecruiter ? '' : 'not-allowed',
      }}>
        <div style={{ textDecoration: messageRecruiter ? '' : 'line-through', color: messageRecruiter ? '' : 'red' }}>
          <b>Message to Recruiter:</b>
        </div>
        <button className={'linkbtn'}
                disabled={!messageRecruiter}
                onClick={() => messageRecruiter && setMessageRecruiterPopoverOpen(true)}
                style={{ 
                  cursor: messageRecruiter ? 'pointer' : 'not-allowed',
                  textDecoration: messageRecruiter ? '' : 'line-through', 
                  color: messageRecruiter ? '' : 'red' 
                }}
        >
          Edit
        </button>
      </div>

      {messageRecruiterPopoverOpen && (
        <Popover id="messageRecruiterPopover" title="Message to Recruiter" onClose={() => setMessageRecruiterPopoverOpen(false)}>
          Give the AI instructions on what to say to a recruiter on LinkedIn.
          <textarea 
            value={messageToRecruiter} 
            onChange={(e) => setMessageToRecruiter(e.target.value)} 
            style={{ width: '100%', height: '100px' }} 
          />
        </Popover>
      )}
    </>
  );

  return (
    <div id='settings' style={{ padding: '1em' }}>
      <div style={{ marginBottom: '1em' }}>
      {viewFormInstructions}
      <AccountBio userData={userData} setUserData={setUserData} />
      </div>
      <details open>
        <summary style={{ marginBottom: '.5em', cursor: 'pointer' }}><b>LinkedIn</b></summary>
        <div  style={{ border: '1px solid #e1e4e8', padding: '.5em .25em .5em .25em', borderRadius: '.25em', marginBottom: '1em' }}>
        <div style={{ marginBottom: '1em',  }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}> 
              <div><b>Continuous Mode</b>:</div>
              <div>
                <label style={{ cursor: 'pointer' }}>
                {continuousMode ? "On" : "Off"} 
                <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                style={{ marginTop: '5px' }}
                />
                </label>
              </div> 
            </div>
          </div>
          <div style={{ marginBottom: '1em' }}> 
            {viewSkipCompany}
          </div>
          <div style={{ marginBottom: '1em' }}>
            {viewSkipTitle}
          </div>
          <div style={{ marginBottom: '1em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <b>Message Recruiter:</b>
              </div>
              <div>
                <label style={{ cursor: 'pointer' }}> {messageRecruiter ? "Yes" : "No"}
              <input
                type="checkbox"
                checked={messageRecruiter}
                onChange={(e) => setMessageRecruiter(e.target.checked)}
                style={{ marginTop: '5px' }}
              />
            </label> 
              </div>
            </div>

          </div>
          <div style={{ marginBottom: '0px' }}> 
            {viewMessageRecruiter}
          </div> 
        </div>
      </details>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div></div>
        <button
          onClick={handleSave} 
          style={{
            padding: '.5em 1em',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '.25em',
            cursor: 'pointer',
            opacity: 1,
          }}
        >
          Save
        </button>
      </div>
      <hr />
    </div>
  )
}

export default SettingsTab
