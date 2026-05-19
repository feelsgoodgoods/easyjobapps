// console.clear() 
// console.log('content_linkedin.js')
async function linkedInAutoApply(body) {
  // console.log('linkedInAutoApply', body);
  // const { user, post } = body;
  // userData && (window.userData = userData);
  // postData && (window.postData = postData);
  // let { companyName, coverletterId, jobDescription, newcoverletterText, postText, resumeId } = post;
  // let { credits, jwt, bio, coverletters, resumes, openaikey, username } = user;
  
  let flag = window.location.href.includes('linkedin.com/jobs/collections') || 
  window.location.href.includes('linkedin.com/jobs/search/') || 
  window.location.href.includes('linkedin.com/jobs/view/')
  if (!flag) return { success: false }; 
  console.log('is on linkedin.com/jobs/');
  
  console.log({
    userData: window.userData,
    postData: window.postData,
    appLinkedInfo: window.appLinkedInfo,
    devSettings: window.devSettings,
    applySettings: window.applySettings,
    editorData: window.editorData,
  })
  window.applySettings?.continuousMode ? 
    await continuousMode(): 
    await linkedinApply();

  return { success: true }; 
}

// Scroll, Find Easy Apply Buttons, and Click one by one 
let continuousMode = async () => {
  console.log('continuousMode')
  
  window.toggleStatusNotification(true, "Collecting 'Easy Apply' Jobs.");  
  for (const pick of await findEasyTopPicks()) { pick.click(); await delay(4000); await linkedinApply(); }
  console.log('Finished Running. RERUNNING')

  // Find the currently active page button
  let activePage = document.querySelector('.artdeco-pagination__indicator--number.active');
  if (activePage) {
    // Find the next pagination button
    let nextPage = activePage.nextElementSibling;
    if (nextPage && nextPage.querySelector('button')) { 
      nextPage.querySelector('button').click(); 
      await delay(4000); 
      continuousMode();
    } else {
      window.toggleStatusNotification(true, "No More 'Easy Apply' Jobs Found.");
      console.log('No more pages to navigate.');
    }
  } else {
    window.toggleStatusNotification(true, "Continuous Mode: No 'Easy Apply' Jobs Found.");
    console.log('Active pagination not found.');
  }
}

let generatedResumePromise = null; 

async function linkedinApply(){
  // console.log('linkedinApply')

  let easyApplyButton = findEasyApplyButton(); 
  if(!easyApplyButton){ 
    window.toggleStatusNotification(true, "No 'Easy Apply' Button Found.");
    console.log('NO EASY APPLY BUTTON'); let d = await delay(200); return false
  } 

  const storageKey = 'linkedInJobApplications';
  let applications = JSON.parse(localStorage.getItem(storageKey) || '[]');

  // console.clear();
  // console.log('Applying with', {userData: window.userData})
  await delay(500); 

  const postText = window.postData?.text 
  window.jobPost = await window.getPost() 
  if(!jobPost){
    window.toggleStatusNotification(true, 'ERROR.');
    return
  }
  console.log('appLinkedInfo:', window.jobPost); 

  applications.push( window.jobPost )
  localStorage.setItem(storageKey, JSON.stringify(applications)); 

  // Start resume generation immediately after getting job info
  generatedResumePromise = window.generateResume();
 
  // Close all chat boxes
  let msgBoxes = document.querySelectorAll('.msg-convo-wrapper') 
  msgBoxes.forEach( async msgBox => {
    let headerCntrls = msgBox.querySelector('.msg-overlay-bubble-header__controls') 
    headerCntrls && headerCntrls.querySelectorAll('button')[headerCntrls.querySelectorAll('button').length - 1].click();
    await delay(1000)
   } )

  !window.devSettings.message || await sendMessageToRecruiter();

  await delay(1000); 

  // const file = new File([await generateResume()], "resume.pdf", { type: "application/pdf" }); 
  // Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: file.name }).click();  

  easyApplyButton.click();
  await delay(500); 
  let t = await easyApply()
  console.log('Applied?', t)
  window.postData = false;
  if(!t){ 
    !window.devSettings.message || window.toggleStatusNotification(true, "Error With Application.");
    console.log('Error With Application');
    await skipCurrentJob(); 
    return false
   }  
  return t
}

async function skipCurrentJob(){
  console.log('skipCurrentJob')
  // get the container
  let container = document.querySelector('.jobs-easy-apply-modal'); 
  // click the first button
  let dismiss = container.querySelector('button');
  console.log({dismiss})
  dismiss.click();
  await delay(1000);
  // find .artdeco-modal artdeco-modal--layer-confirmation and click the first button 'discard'
  let layer = document.querySelector('.artdeco-modal--layer-confirmation')
  console.log({layer})
  let confrimC = layer.querySelector('.artdeco-modal__confirm-dialog-btn');
  console.log({confrimC})
  confrimC.click();
  return
}
 
// Handles Job Application Form Logic
window.strikes = 0;
async function easyApply(){
  if (window.strikes > 3) {
    window.toggleStatusNotification(true, 'Too Many Errors. Stopping.');
    window.strikes = 0;
    return false;
  }
  // Skip Warning
  let continueApplyingBtn = document.querySelector('.jobs-apply-button')
  if(continueApplyingBtn){ continueApplyingBtn.click(); await delay(1000); }

  // Navigation Buttons
  let nextButton = document.querySelector('button[aria-label="Continue to next step"]');
  let reviewButton = document.querySelector('button[aria-label="Review your application"]');
  let submitButton = document.querySelector('button[aria-label="Submit application"]');

  // Uncheck subscribe button 
  let unsubscribeButton = document.getElementById("follow-company-checkbox"); 
  if (unsubscribeButton && unsubscribeButton.checked) { 
    // console.log('UNSUBSCRIBE BUTTON'); 
    unsubscribeButton.click();
    await delay(50);
  }

  // Handle Uploads
  const uploadButtons = Array.from(document.querySelectorAll('.jobs-document-upload__upload-button') );
  for (const button of uploadButtons) {
    const ariaLabelText = button.querySelector('span[aria-label]').getAttribute('aria-label');
    let label = button.innerText.toLowerCase();
    let success = false;
  
    // Check Cover Letter
    if (label.includes('cover')) {
      // console.log('- easyApply - Coverletter BUTTON', { button });
      success = !window.devSettings.coverletter || await handleCoverLetterFileUpload(button);
    }
    // Check Resume
    else if (label.includes('resume')) {
      // console.log('- easyApply - RESUME BUTTON', { button });
      success = !window.devSettings.resume || await handleResumeFileUpload(button);
    }
    // Check Photo
    else if (/jpg|jpeg|gif/i.test(ariaLabelText)) {
      console.log('- easyApply - PHOTO BUTTON', { button });
      success = await handlePhotoFileUploadFromUrl(button);
    }
    // Check Additional Doc Upload
    else if (/doc|docx|pdf|rtf|plain|odt|wpd|dot/i.test(ariaLabelText)) {
      console.log('- easyApply - Additional Upload BUTTON', { button });
      // Get parents first child label radio input and unclick it if so
      let parent = button.parentElement.parentElement.parentElement;
      let radio = parent.querySelector('input[type="radio"]');
      console.log(radio, radio?.checked);
      if (radio && radio?.checked) {
        let label = parent.querySelector('label');
        label.click();
        success = true;
      }
    }
  
    if (!success) {
      // alert('Upload Error: Ensure setup and or logged in.');
      console.log('Upload Error: Ensure setup and or logged in.');
      window.strikes = (window.strikes || 0) + 1;
    }
  }
  
  let moveOn = async () => {
    try{
      try{
        try{
          nextButton.click();
          return true
        }
        catch(e){ 
          reviewButton.click();
          return true
        } 
      }
      catch{
        if(window.devSettings.submit){
          if(window.devSettings.submitDelay){
            let div = document.createElement('div');
            div.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 110000; background-color: red;';
            document.body.appendChild(div);
            let colors = ['red', 'white', 'blue'];
            let colorIndex = 0;
            let interval = setInterval(() => {
              div.style.backgroundColor = colors[colorIndex];
              colorIndex = (colorIndex + 1) % colors.length;
            }, 200);  
            setTimeout(() => {
              clearInterval(interval);
              div.remove();
            }, 2000); // Remove the div after 4 seconds
            
            await delay(20000);
          }
          console.log('CLICKING SUBMIT')
          window.toggleStatusNotification(true, 'Submitting Form.')
          submitButton.click();
          await delay(4000);
          let doneBtn = document.querySelector('.artdeco-button');
          // console.log('CLICKING DONE', {doneBtn})
          doneBtn.click();
          await delay(500);  
          return false
        }
        else{
          console.log('NOT CLICKING SUBMIT')
        }

      }
    }
    catch(e){
      console.log('Content_Linkedin: Unknown issue.', e);
      checkForErrors();
      delay(10000);
      return false
    }
  }
   
// Get Form Fields 
let formFields = await getFormInputsAndDropdowns();  

  // Get Form Field Values  
  let lsval = 'historicalQs12'
  const storedFields = JSON.parse(localStorage.getItem(lsval) || '[]');
  const matchedFields = [];
  const unmatchedFields = [];
  
  formFields.forEach(field => {
    const storedField = storedFields.find(stored => {
      let matching = stored.label === field.label // Same Question
      matching &&= stored.type === field.type // Same Input Type
      matching &&= (!stored.instructions || !field.instructions || stored.instructions === field.instructions)  // No special instructions

      // if type is radio or checkbox, check if the options are the same (compare labels)
      if (stored.options && field.options) { 
        const storedOptions = stored.options.map(option => option.label).sort();
        const fieldOptions = field.options.map(option => option.label).sort();
        matching &&= JSON.stringify(storedOptions) === JSON.stringify(fieldOptions); // Same Options
      }
      return matching;

    });

    if (storedField) {
      matchedFields.push({
        ...storedField,
        element: field.element,
        fieldIndex: field.fieldIndex
      });
    } else {
      unmatchedFields.push(field);
    }
  });

  // Only process unmatched fields with ChatGPT
  let chatGPTFields = [];
  if (unmatchedFields.length > 0) {
    console.log('Unmatched Fields:', unmatchedFields);
    chatGPTFields = await processFormLinkedIn(unmatchedFields);
  }
  if(matchedFields.length > 0){
    console.log('Matched Fields:', matchedFields);
  }

  // Combine matched and new fields, maintaining order
  const newformFields = [
    ...matchedFields,
    ...chatGPTFields
  ].sort((a, b) => a.fieldIndex - b.fieldIndex);

  console.log('Form Fields:', newformFields);

  // Fill Form 
  await fillLinkedInForm(newformFields)  

  // Click next button if it exists
  let continueEdit = await moveOn()
  if(!continueEdit){ 
    console.log('!continueEdit'); 
    window.toggleStatusNotification(true, 'Application Submitted.'); 
    delay(4000);
    window.toggleStatusNotification(false) 
    return true
  }

  if (document.querySelector('.artdeco-inline-feedback__message')) {
    window.strikes = (window.strikes || 0) + 1;
  } else {
      window.strikes = 0;

      // Save form fields to local storage
      let storedFields = JSON.parse(localStorage.getItem(lsval) || '[]');
      newformFields.forEach(newField => {
        if (!storedFields.some(existingField => 
          existingField.label === newField.label && 
          existingField.type === newField.type &&
          (!existingField.instructions || !newField.instructions || 
           existingField.instructions === newField.instructions)
        )) {
          storedFields.push(newField);
        }
      });
      localStorage.setItem(lsval, JSON.stringify(storedFields)); 

  }

  console.log('STRIKES:', window.strikes);
  console.log('Total unique form fields:', storedFields, storedFields.length);
  
  window.toggleStatusNotification(true, 'Filling Form..')
  await delay(1000);
  return await easyApply(); 

  // // Handle Terms of Service checkbox
  // let termsElement = document.querySelector('.some-selector');  // Replace with actual selector
  // let termsHandled = handleTermsOfService(termsElement);
  // console.log("Terms of Service handled:", termsHandled);  
}

async function sendMessageToRecruiter(){ 
  !window.devSettings.message || window.toggleStatusNotification(true, "Attempting to Message Recruiter.");
  
  let messageRecruiter = window?.applySettings?.messageRecruiter
  messageRecruiter = !messageRecruiter ? messageRecruiter : messageRecruiter == 'true' ? true : false
  if(!messageRecruiter) return false 
  const messageToRecruiter = window.applySettings.messageToRecruiter

  // let jobTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title').textContent;
  let meetHiringTeamContainer = document.querySelector('.job-details-module__content');
  meetHiringTeamContainer ||= Array.from(document.querySelectorAll('.job-details-module'))
      .find(item => item.textContent.includes('Meet the hiring team'));
  let messageBtn = meetHiringTeamContainer && meetHiringTeamContainer.querySelector('button') 
  if ( messageBtn){
      console.log('SENDING MESSAGE TO RECRUITER')
      messageBtn.click();
      await delay(2000)
      let msgBox = document.querySelector('.msg-convo-wrapper') 
      let closePremiumAdBtn = document.querySelector('button[aria-label="Dismiss"]');
      if(!msgBox?.children.length && closePremiumAdBtn){ 
        // console.log('closing ad'); s
        closePremiumAdBtn.click()
      }
      else if(msgBox){
          console.log({message:'MESSAGE', msgBox, userData})
          try{
            let subject = msgBox.querySelector('input')
            subject.value = `Job Opening`
            subject.dispatchEvent(new Event('input', { bubbles: true }));

            let text = msgBox.querySelector('div.msg-form__contenteditable').querySelector('p');
            console.log({subject,text})
            let recruiterName = (
              msgBox.querySelector('.msg-compose__profile-link') || 
              msgBox.querySelector('.profile-card-one-to-one__profile-link')
            ).innerText.trim();
            let system_message = {
              role: "system",
              content: `
                <Instructions> 
                  You help send messages on linkedIn to company representatives on behalf of a job applicant. 
                  You are sending a message to a person by the name of ${recruiterName}. 
                  Use the <ResumeText>, <ApplicantMessage>, <ApplicantBio>, and <CompanyDescriptionAndJobRequirements> as references. 
                  ${messageToRecruiter} 
                  The <CompanyDescriptionAndJobRequirements> may help you tailor your message to the company and role.    
                </Instructions> 
                <ResumeText>${window.userData.resumetext}</ResumeText>
                <ApplicantsBio>${window.userData.bio}</ApplicantsBio> 
              `
            };
            let user_message = {
              role: "user",
              content: ` 
              <CompanyAndJobAndApplicationInformation>${JSON.stringify(window.appLinkedInfo)}</CompanyAndJobAndApplicationInformation>
              `
            };  
            
            let post = [system_message, user_message];
            const message = await callChatGPT(post, "gpt-4.1-mini", 4096, false, true); 
            console.log('MESSAGE TO RECRUITER', {message})
            text.innerHTML = message 
            text.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(2000);
            let submitBtn = msgBox.querySelector('button.msg-form__send-btn') || msgBox.querySelector('.msg-form__send-button');
            console.log('clicking submit', submitBtn)
            submitBtn.click()
            await delay(3000);
          }
          catch(e){
              console.log('Error:Already Sent Message:', {e})
          }
          let headerCntrls = msgBox.querySelector('.msg-overlay-bubble-header__controls')
          let btns = headerCntrls?.querySelectorAll('button');
          console.log({headerCntrls, btns})
          btns && btns[btns.length - 1]?.click();
      } 
  } 
}

// Get Job Details
window.linkedInAutoApply = linkedInAutoApply

/*



userData : 
bio : [{…}] 0?.text
coverletters : []
credits :  "0"
jwt : ""
openaikey : [{…}] ERROR!!!
resumes : [{…}] 0?.text
username : "guest_d660f427"

resumesText : 
file : null 
latexText : "" 
tailor : "0"
tailorText : "Please refer to this table for the number of bullet points I require you to add for each job. \n\nYou MUST do this or else your work is no good.\n \n\nPast Job | Minimum Number of Bullet Points\nAutoApply | 5\nAddyAI | 5\nCryptoVoxels | 3\nNational Science Foundation | 1\nUniversity of Baltimore | 4\nFreelance | 2\n\nIf you include the 'Tools' part, strip it down to include relevant ones.\n\nDo not include a references section.\n\nPlease use keyword stuffing. When keyword stuffing with tools and technologies, please only do that if the word shows up in my resume's tool list. \n\nfinally\n\nCut the executive summary down to 3 sentences and have it speak to the job post."
template : "Compressed"
text : "---\nname: \"Charles Karpati\"\nemail: \"Charles. 
*/

  // Create a container for all elements
  // let container = document.getElementById('easyjobapps-container');
  // let easyJobAppsButton = document.getElementById('easyjobapps-button');
  // easyJobAppsButton.innerHTML = 'Close';
  // console.log('tt', window.linkedInMenuVisible)

  // if (!window.linkedInMenuCreated) {
  //   console.log('CREATING MENU')
  //   let linkedInContainer = document.createElement('div');
  //   linkedInContainer.id = 'easyjobapps-linkedin-container';
  //   // Create 'Continuous Mode' button
  //   let button = document.createElement('button');
  //   let button2 = document.createElement('button'); 
  //   let checkboxDiv = document.createElement('div'); 
  //   button.textContent = 'Continuous Mode';
  //   button2.textContent = 'Apply';    
  //   checkboxDiv.innerHTML = `
  //   <input type="checkbox" id="createCustomResume" name="createCustomResume" checked>
  //   <label for="createCustomResume" style="color:white !important;">Create Custom Resume</label>
  //   `;
  //   button.onclick = async () => { console.log('clicked'); await continuousMode(); };
  //   button2.onclick = async () => { await linkedinApply(); };
  //   button.style = buttonStyle;
  //   button2.style = buttonStyle;
  //   linkedInContainer.appendChild(button);   
  //   linkedInContainer.appendChild(button2); 
  //   linkedInContainer.appendChild(checkboxDiv);
  //   container.appendChild(linkedInContainer);
  //   window.linkedInMenuCreated = true;
  //   window.linkedInMenuVisible = true;
  // }
  // if(!window.linkedInMenuVisible){
  //   console.log('SHOWING MENU')
  //   let linkedInContainer = document.getElementById('easyjobapps-linkedin-container');
  //   linkedInContainer.style.display = 'block';
  //   window.linkedInMenuVisible = true;
  // }  k0