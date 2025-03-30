
// postData: companyName, company_id, id, jobTitle, link, meta, reject, status, text, user_id 
window.sendIt = async (newPostData, needsCleaning = true) => {     
  newPostData = { ...newPostData }  
  chrome.runtime.sendMessage({ toAppAction: 'handleAutoLoad', data : {newPostData, needsCleaning} });  
  window.postDataUpdated = true  
} 

// 

async function getPost() { 
  let hostname = window.location.hostname
  console.groupCollapsed('Get Post' );  
  window.toggleStatusNotification(true, 'Gathering Job Information.')
  
  const isLinkedin = window.location.href.includes('linkedin.com/jobs/collections') || 
  window.location.href.includes('linkedin.com/jobs/search/') || 
  window.location.href.includes('linkedin.com/jobs/view/')

  let returnThis = { text: (
    isLinkedin ? await getJobInformation() :
    hostname === 'job-boards.greenhouse.io' ? await getGreenhouseJobDescription() : 
    hostname === 'boards.greenhouse.io' ? await getGreenhouseboardsJobDescription() : 
    hostname === 'jobs.ashbyhq.com' ? await getAshbyHqJobDescription() : false ) }
 
  if(returnThis.text){    
    console.log('Get Post:', {returnThis})
    sendIt(returnThis, false); 
    console.groupEnd(); 
    window.toggleStatusNotification(false)
    return returnThis 
  }
  else{ returnThis = [] }

  // Get all iframes urls from the page 
  let iframes = document.querySelectorAll('iframe');
  console.log('IFRAMES:', iframes)
  let iframeSrcs = Array.from(iframes).map((iframe) => iframe.src)
  console.log('IFRAMES:', iframeSrcs)
  // check if it matches all the links in the array from  greenhouse to ashby etc
  let links = ['https://job-boards.greenhouse.io/', 'https://boards.greenhouse.io/'];
  let match = false;
  iframeSrcs.forEach((src) => {
    console.log('iframe:src:', src);
    if (links.some((link) => src.startsWith(link))) {
      console.log('MATCH:', src);
      match = src; 
    }
  });
  // if it matches, then exit and display a message that the must be completed on the original site
  if (match) {  
    window.toggleStatusNotification(false)
    return { error: 'iframe', message: match } 
  }

  let removeThese = 'script,style,link,meta,comment,noscript,svg,iframe,image,video,audio,canvas,iframe'
  let body = document.querySelector('body')
  body.querySelectorAll(removeThese).forEach((e) => e.remove())
  returnThis.push(body.textContent.trim())
  returnThis = { text: returnThis }  
  
  sendIt(returnThis); 
  console.groupEnd(); 
  window.toggleStatusNotification(false)
  return returnThis 
}

window.getForms = async function () { 
  console.groupCollapsed('Get Forms')
  let form = false
  if (window.location.hostname === 'apply.workable.com') { 
    let result = await getGreenhouseboardsForm()
    console.groupEnd()
    return result
  }
  if (window.location.hostname === 'job-boards.greenhouse.io') { 
    let result =  await getGreenhouseForm()
    console.groupEnd()
    return result
  }
  if (window.location.hostname === 'boards.greenhouse.io') { 
    let result =  await getGreenhouseboardsForm()
    console.groupEnd()
    return result
  }
  if (window.location.hostname === 'jobs.ashbyhq.com') { 
    let result =  await getAshbyHqForm()
    console.groupEnd()
    return result
  }
  // if (window.location.hostname === 'careers.upstart.com/jobs') {
  //   form = document.getElementById('#new_form_submission_3_0')
  // }   

  // let body = document.querySelector("body");
  let forms = document.querySelectorAll('form')
  let applyForms = Array.from(forms)
  let returnThis = []
  let removeThese = 'script,style,link,meta,comment,noscript,svg,image,video,audio,canvas'

  applyForms.forEach((form) => { 
    form.querySelectorAll(removeThese).forEach((e) => e.remove())
    returnThis.push(form.outerHTML)
  })

  if (!returnThis.length) {
    let body = document.querySelector('body')
    body.querySelectorAll(removeThese).forEach((e) => e.remove())
    returnThis.push(body.outerHTML)
  }
  let data = { forms: returnThis }
  console.groupEnd()
  return data
}

async function getAshbyHqJobDescription() {
  console.log('AshbyHq Job Description')
  // let { name, publicWebsite, timezone } = window.__appData.organization;
  // let { title, publishedDate, secondaryLocationNames, locationName, isRemote, emplymentType, descriptionPlainText, departmentName, applicationForm: {entries} } = window.__appData.posting;
  document.getElementById('job-overview').click()
  let url = window.location.href
  function getCompanyName(url) {
    const match = url.match(/jobs\.ashbyhq\.com\/([^/]+)/);
    return match ? match[1] : null;
  }
  let jobPost = 'Application URL: ' + url + ', CompanyName: '+ getCompanyName(url) + ', Content: ' + (document.querySelector('.ashby-job-posting-left-pane')?.innerText || '') + document.querySelector('#overview').innerText
  return jobPost
}

async function getAshbyHqForm(request) {
  console.log('AshbyHq Form')
  // get job description from 'Overview' tab
  document.getElementById('job-overview').click()
  let jobPost = document.querySelector('#overview').innerText
  // then click 'Application' tab
  document.getElementById('job-application-form').click()
  // get job application form
  let form1 = document.querySelector('.application--container')

  function escapeIdForQuerySelector(id) {
    return id.replace(/([!$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1').replace(/^(\d)/, '\\3$1 ')
  }

  // Select all form fields (you can adjust the selector to match the actual form structure)
  const formFields = document.querySelectorAll('div.ashby-application-form-field-entry')

  // Iterate through each form field
  let returnThis = []
  returnThis = Array.from(formFields).map((field) => {
    // console.log('field:', field);
    // Get the input element inside the field
    const inputElement = field.querySelector('input, textarea, select')
    let type = 'text'
    const labelElement = field.querySelector('label')
    const labelText = labelElement ? labelElement.innerText : null
    const required = labelText && labelText.includes('*')
    const promptText = field.querySelector('._description_hkyf8_49') ?.innerText || null
    const warnings = field.querySelector('._instructions_6k3nb_34') ?.innerText || null

    let options = null

    // Checkbox and Radio Buttons
    let inputs = field.querySelectorAll('input[type="radio"], input[type="checkbox"]')
    options = Array.from(inputs).map((input) => {
      type = 'checkbox'
      return {
        displayText: input.innerText,
        value: input.innerText,
        element: input,
        querySelector: `input[name='${input.name}']`,
      }
    })

    return {
      labelText: labelText,
      id: inputElement ? `#${inputElement.id}` : null,
      querySelector: inputElement ? `[name="${inputElement.name}"]` : null,
      type: type,
      promptText: promptText,
      warnings: warnings,
      required: required,
      options: options,
    }
  })

  // Checkboxes are not captured by the prior querySelector
  let cont = document.querySelector('.ashby-survey-form-container') 

  let returnThisAdditionally = []
  returnThisAdditionally = Array.from(document.querySelectorAll('fieldset')).map((fieldset) => {
    // console.log('-------- fieldset:', fieldset)

    // Get the label for the checkbox or radio group
    const fieldsetLabel = fieldset.querySelector('label') ? fieldset.querySelector('label').innerText : null

    // Determine if this fieldset contains radio buttons or checkboxes
    let type
    if (fieldset.querySelector('input[type="checkbox"]')) {
      type = 'checkbox'
    } else if (fieldset.querySelector('input[type="radio"]')) {
      type = 'radio'
    }

    // Get all the options (labels and their corresponding input IDs)
    const options = Array.from(fieldset.querySelectorAll('input')).map((input) => { 
      // console.log('input', input.id, input)
      if(!input.id){return null}
      const optionLabel = fieldset.querySelector(`label[for="${input.id}"]`).innerText
      return {
        querySelector: `#${escapeIdForQuerySelector(input.id)}`,
        label: optionLabel,
        selected: input.checked, // Get whether the checkbox or radio button is selected
      }
    }).filter((option) => option) // Filter out any options without a label

    return {
      // container: fieldset,
      type: type, // Either 'checkbox' or 'radio'
      label: fieldsetLabel,
      options: options,
    }
  })

  console.log('FIELDS:')
  console.table([...returnThis, ...returnThisAdditionally])
  return [...returnThis, ...returnThisAdditionally]
}
async function getGreenhouseJobDescription() {
  let jobPost = `URL: ${window.location.href} 
  Job Title: ${document.querySelector('.job__title')?.innerText} 
  Job Description: ${document.querySelector('.job__description')?.innerText}
  `
  return jobPost
}
async function getGreenhouseForm() {
  let jobPost = window.location.href + document.querySelector('.job__title')?.innerText + document.querySelector('.job__description')?.innerText
  let form1 = document.querySelector('.application--container')
  if (form1) {
    console.log('form:', form1)
    const formElements = document.querySelectorAll('form input, form textarea, form select, form button[type="submit"], form fieldset')

    const formInfoArray = []

    formElements.forEach((element) => {
      if (element.tagName.toLowerCase() === 'fieldset') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]')
        const checkboxGroup = {
          informationRequested: element.querySelector('legend').textContent.trim(),
          id: null,
          querySelector: `fieldset#${element.id}`,
          name: checkboxes.length > 0 ? checkboxes[0].name : null,
          currentValue: null,
          type: 'checkbox-group',
          options: Array.from(checkboxes).map((checkbox) => ({
            id: checkbox.id,
            value: checkbox.value,
            label: element.querySelector(`label[for="${checkbox.id}"]`).textContent.trim(),
            checked: checkbox.checked,
          })),
        }
        formInfoArray.push(checkboxGroup)
      } else {
        // Try to find the nearest label using `for` attribute or direct parent.
        let label = element.closest('label') || document.querySelector(`label[for="${element.id}"]`)

        let info = {
          informationRequested: label ? label.textContent.trim() : null,
          id: element.id || null,
          querySelector: `#${element.id}`,
          name: element.name || null,
          currentValue: element.value || null,
          type: element.type || element.tagName.toLowerCase(),
          options: {},
        }

        if (element.tagName.toLowerCase() === 'select') {
          info.options = Array.from(element.options).map((option) => ({
            value: option.value,
            text: option.text,
          }))
        }

        if (element.type !== 'checkbox') {
          formInfoArray.push(info)
        }
      }
    })

    console.log({ formInfoArray })
    return formInfoArray
  } else {
    console.log('Greenhouse FORM NOT FOUND')
  }
}
async function getGreenhouseboardsJobDescription() {
  let title = document.querySelector('.app-title').innerText
  let companyName = document.querySelector('.company-name').innerText
  let location = document.querySelector('.location').innerText
  let postText = document.querySelector('#content').innerText
  let jobPost = `URL: ${window.location.href}, Job Title: ${title}, Company: ${companyName}, Location: ${location}, JobPost: ${postText}`
  return jobPost
}
async function getGreenhouseboardsForm() {
  let title = document.querySelector('.app-title').innerText
  let companyName = document.querySelector('.company-name').innerText
  let location = document.querySelector('.location').innerText
  let postText = document.querySelector('#content').innerText
  let formEl = document.querySelector('#application_form')
  let jobPost = `${title} ${companyName} ${location} ${postText}`
  // let form1 = formEl.elements
  let formFields = document.querySelectorAll('.field')
  let extractedData = []
  formFields.forEach((field, index) => {
    if (field.closest('#dev-fields')) {
      return
    }
    if (field.querySelector('#security_code')) {
      return
    }
    console.log('Field:', field)
    let labelElement = field.querySelector('label')
    let inputElements = field.querySelectorAll('input, textarea, select')
    let inputElement = [...inputElements].find((input) => {
      // not hidden
      let flag = input.type !== 'hidden'
      // not display none
      flag = flag && (!flag?.style?.display || flag.style.display !== 'none')
      return flag
    })
    let options = []
    let label = labelElement ? labelElement.innerText.trim() : ''
    let id = inputElement ? inputElement.id : ''
    let querySelector = inputElement ? `#${id}` : ''
    let name = inputElement ? inputElement.name : null
    let currentValue = inputElement ? inputElement.value : null
    let type = inputElement ? inputElement.tagName.toLowerCase() : ''

    // Handle select elements and target corresponding <option> elements
    let selectElement = field.querySelector('select')
    if (selectElement) {
      type = 'select'
      id = selectElement.id
      querySelector = `#${id}`
      name = selectElement.name
      currentValue = selectElement.value

      // Get the corresponding <li> elements of the <option>s in the select2 dropdown
      let listbox = selectElement.closest('div').querySelector('ul.select2-results__options')

      options = [...selectElement.options]
        .filter((option) => option.value && !['Please select', 'select', '--'].includes(option.innerText.trim()))
        .map((option) => {
          // console.log('select Option:', option)
          let correspondingLi = listbox ? listbox.querySelector(`li[data-value="${option.value}"]`) : null
          return {
            value: option.value,
            id: correspondingLi ? correspondingLi.id : null,
            querySelector: correspondingLi ? `#${correspondingLi.id}` : null,
            labelText: option.innerText.trim(),
          }
        })
    }

    // Handle input and textarea elements
    if (inputElement && !selectElement) {
      if (inputElement.tagName.toLowerCase() === 'input') {
        type = inputElement.type || 'text'
      } else if (inputElement.tagName.toLowerCase() === 'textarea') {
        type = 'textarea'
      }
    }

    // Special case for Resume/Cover Letter targeting the "Attach" option
    if (field.querySelector('[data-field="resume"]')) {
      label = 'Attach'
      type = 'file'
      id = ''
      label = 'resume'
      querySelector = "button[data-source='attach']"
      currentValue = null // No value yet for the "Attach" file
    } else if (field.querySelector('[data-field="cover_letter"]')) {
      label = 'Attach'
      type = 'file'
      id = ''
      label = 'coverletter'
      querySelector = "button[data-source='attach']"
      currentValue = null // No value yet for the "Attach" file
    }

    // Push the data into the array
    extractedData.push({
      informationRequested: label,
      id: id,
      querySelector: querySelector,
      name: name,
      currentValue: currentValue,
      type: type,
      options: options,
    })
  })

  console.log('form:', extractedData, { formEl, allels: formEl.elements })
  return extractedData
}
async function getWorkableForm(request) {}



/*
view-source:https://careers.team.blue/jobs/5204501-full-stack-web-developer
    <script type="application/ld+json">
{
  "@context": "http://schema.org/",
  "@type": "JobPosting",
*/
/*
view-source:https://boards.greenhouse.io/supplyhouse/jobs/5374932004?gh_jid=5374932004
  <script type="application/ld+json">
  {"@context":"schema.org","@type":"JobPosting",
*/
/*
view-source:https://beyonnex.jobs.personio.de/job/1829716?language=en&display=en
            <script type="application/ld+json">
            {"@context":"https:\/\/schema.org\/","@type":"JobPosting",
*/
/*
<turbo-frame loading="lazy" data-careersite--jobs--form-overlay-target="turboFrame" id="application_form" src="https://careers.rpharms.com/jobs/5206338-cloud-engineer/applications/new">
        <p class="flex flex-col items-center justify-center text-lg gap-y-4">
          <i class="text-3xl fas fa-spinner fa-spin"></i>
          Loading application form
        </p>
</turbo-frame>
*/
/*
https://www.smartrecruiters.com/mobica/744000026712795
<meta property="og:description" content="Company Description: Mobica | Be Extraordinary_&amp;
*/

  // if(jwt){ 
  //   console.log('Sending Doc to Server')
  //   const domain = window.devSettings.localServer ? 'http://127.0.0.1:3002' : 'https://getfrom.net'
  //   // fetch domain+`/extension_post_create` using returnThis as the body
  //   let response = await fetchResource(domain + '/extension_post_create', {
  //     method: 'POST',
  //     headers: { 
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${jwt}`
  //     },
  //     body: JSON.stringify({text:newPostData, needsCleaning}),
  //   })
  //   response = await response.json()  
  //   resp = response?.data 
  //   console.log('SENT:extension_post_create:Response:', {response}) // id, company_id, jobTitle, text 
  //   chrome.runtime.sendMessage({ toAppAction: 'handleAutoLoad', data : resp });  
  // }
  // else{
    // Attempt sending to client.  // } 