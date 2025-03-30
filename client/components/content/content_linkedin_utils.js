// Page Handling
// Complete JavaScript File for LinkedIn Easy Apply Automation
function scrollPage(step = 300, reverse = false) {
  let direction = reverse ? -step : step
  window.scrollBy(0, direction)
  setTimeout(() => {
    window.scrollBy(0, -direction)
  }, 1000) // Scroll back after 1 second
}

let scrollSidebar = async () => {
  const element = document.querySelector('.jobs-search-results-list')
  let wait = true
  if (element) {
    element.scrollTop = element.scrollTop == 0 ? element.scrollHeight : 0
    wait = await delay(2000)
    element.scrollTop = element.scrollTop == 0 ? element.scrollHeight : 0
    wait = await delay(1000)
  } else {
    console.warn('.jobs-search-results-list element not found')
  }
  return true
}

async function findEasyTopPicks() {
  await scrollSidebar()
  await window.delay(1500)
  
  let easyTopPicks = Array.from( document.querySelectorAll('.job-card-container') ) 
  if (easyTopPicks.length === 0) {
    const btnsArr =  Array.from( document.querySelector('.jobs-search-results-list__pagination').querySelectorAll('button') )
    const currentIndex = btnsArr.findIndex((btn) => btn.getAttribute('aria-current') === 'true')
    console.log('currentIndex', currentIndex)
    if (currentIndex >= 0 && currentIndex < document.querySelectorAll('.jobs-search-results-list__pagination button').length - 1) {
      document.querySelectorAll('.jobs-search-results-list__pagination button')[currentIndex + 1].click()
      await delay(1000)
    }
    return await findEasyTopPicks()
  }
  // Filter logic based on ignore lists  
  easyTopPicks = easyTopPicks.filter((container) => { 
    const companyName = ( container.querySelector('.job-card-container__primary-description') || 
                          container.querySelector('.artdeco-entity-lockup__subtitle') 
                        )?.innerText.toLowerCase()
    let jobTitle = container.querySelector('.job-card-list__title strong')?.innerText.toLowerCase()
    jobTitle ||= container.querySelector('.artdeco-entity-lockup__title')?.innerText.toLowerCase()  

    const easyApply = container.innerText.toLowerCase().includes('easy apply') 
    let ignoreCompanyList = (window?.applySettings?.ignoreCompanyList?.trim() || '').split(',').filter(Boolean);
    let ignoreTitleList = (window?.applySettings?.ignoreTitleList?.trim() || '').split(',').filter(Boolean);
    const ignoreCompany = ignoreCompanyList.some((ignore) => companyName.includes(ignore.trim()))
    const ignoreTitle = ignoreTitleList.some((ignore) => jobTitle.includes(ignore.trim()))  
    if (ignoreCompany || ignoreTitle || !easyApply) {
      console.log(`Ignoring:`, {ignoreCompany, ignoreTitle, easyApply, desc: `${jobTitle} at ${companyName}`})
      return false
    }
    return true
  })

  console.log('Filtered Easy Apply Picks', { easyTopPicks })
  return easyTopPicks
}

function findEasyApplyButton() {
  scrollPage()
  let buttons = document.querySelectorAll('button.jobs-apply-button')
  for (let i = 0; i < buttons.length; i++) {
    try {
      let button = buttons[i]
      if (button && button.textContent.includes('Easy Apply')) {
        return button
      }
    } catch (e) {
      console.log(e)
    }
  }
  return false
}

function findLabelText(element) {
  let label = document.querySelector(`label[for="${element.id}"]`)

  if (!label) {
    // Traverse up the DOM to find the closest preceding label
    let currentElement = element.parentElement
    while (currentElement) {
      label = currentElement.querySelector('label')
      if (label) break
      currentElement = currentElement.parentElement
    }
  }

  return label ? label.textContent.trim() : ''
}

async function handleTermsOfService(element) {
  let checkbox = element.querySelector('label')
  if (checkbox && /terms of service|privacy policy|terms of use/i.test(checkbox.textContent)) {
    checkbox.click()
    return true
  }
  return false
}

async function handleTextareaInput(field, questionContainer) {
  let input = questionContainer.querySelector('textarea')

  if (input) {
    input.value = field.value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    console.log('Set textarea value', {value: field.value })
  } else {
    console.warn('Textarea input not found')
  }
}

async function handleDropdownInput(field, questionContainer) {
  let dropdown = questionContainer.querySelector('select')
  // console.log('handle dropdown') //,{dropdown, field, questionContainer})
  if (dropdown) {
    let option = dropdown.querySelector(`option[value="${field.value}"]`)
    if (option) {
      // console.log('CLICKING OPTION')
      option.selected = true
      dropdown.dispatchEvent(new Event('change', { bubbles: true }))
      await delay(500)
      // console.log('Set dropdown value', { value: field.value })
    } else {
      console.warn('Dropdown option not found', { value: field.value })
    }
  } else {
    console.warn('Dropdown not found')
  }
}

async function handleRadioInput(field, questionContainer) {
  console.log('fillFor -> handleRadioInput', {field, options: field.options, questionContainer})
  field.options.map((option) => {
    let radio = questionContainer.querySelector(`input[type="radio"][value="${option.value}"]`)
    // console.log('fillFor -> handleRadioInput -> handle radio', option)
    // first log all radio and values
    if (radio && option.checked) {
      radio.checked = option.checked
      radio.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      console.warn('Radio input not found', { value: field.value })
    }
  })
  await delay(50000)
}

async function handleCheckboxGroupInput(field, questionContainer) {
  let options = field.options

  if (options && options.length > 0) {
    for (let option of options) {
      let checkbox = questionContainer.querySelector(`input[data-test-text-selectable-option__input="${option.label}"]`)

      if (checkbox) {
        checkbox.checked = option.checked
        checkbox.dispatchEvent(new Event('change', { bubbles: true }))
        console.log('Set checkbox value', { label: option.label, checked: option.checked })
      } else {
        console.warn('Checkbox input not found for label', { label: option.label })
      }
    }
  } else {
    console.warn('No options provided for checkbox group')
  }
}

async function handleResumeFileUpload(button) {
  // create a spinner to show that the resume is being uploaded
  const spinner = document.createElement('div')
  spinner.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 100000; display: flex; justify-content: center; align-items: center;'
  spinner.innerHTML = '<div style="color: white; font-size: 24px;">Generating Resume For Upload...</div>'
  document.body.appendChild(spinner) 
  let previousBlob = await generatedResumePromise; // await generateResume()
  if (typeof previousBlob === 'object' && previousBlob.error) { 
    previousBlob = false
  }

  // Convert the Blob to a File object
  const file = new File([previousBlob], 'resume.pdf', { type: 'application/pdf' })

  const success = previousBlob && (await uploadFile(file, button))

  // delete spinner
  spinner.remove()
  return success
}

async function handleCoverLetterFileUpload(button) {
  console.log('Resume Upload.')

  // create a spinner to show that the resume is being uploaded
  const spinner = document.createElement('div')
  spinner.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 100000; display: flex; justify-content: center; align-items: center;'
  spinner.innerHTML = '<div style="color: white; font-size: 24px;">Generating cover letter For upload...</div>'
  document.body.appendChild(spinner)

  let previousBlob = await generateCoverLetter()

  // Convert the Blob to a File object
  const file = new File([previousBlob], 'charles_karpati_cover.pdf', { type: 'application/pdf' })

  const success = previousBlob && (await uploadFile(file, button))

  // delete spinner
  spinner.remove()
  return success
}

async function handlePhotoFileUploadFromUrl(button) {
  const photoUrl = 'https://avatars.githubusercontent.com/u/10605109?v=4'
  const photoBlob = await fetchResource(photoUrl).then((res) => res.blob())
  const file = new File([photoBlob], 'charles_karpati.jpg', { type: 'image/jpeg' })
  console.log('Uploading photo file:', { file })
  const success = await uploadFile(file, button)
  return success
}

async function handleTextInput(field, questionContainer) {
  let input = questionContainer.querySelector('input[type="text"]')
  let isDate = input?.name === 'artdeco-date'

  if (input) {
    if (isDate) {
      const todayButton = document.querySelector('.artdeco-calendar-day-btn--today')

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
      todayButton.dispatchEvent(mouseDownEvent)

      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
      todayButton.dispatchEvent(mouseUpEvent)
    } else if (questionContainer.querySelector('.visually-hidden')) {
      // Handle the dynamic interaction case
      input.value = field.value
      await delay(500)
      input.dispatchEvent(new Event('input', { bubbles: true }))

      // Wait for 2 seconds to allow the dropdown to appear
      await delay(2000)

      // Log the results from the dropdown menu
      let dropdownContent = questionContainer.querySelector('.basic-typeahead__triggered-content')
      if (dropdownContent) {
        // console.log('Dropdown content found:', dropdownContent.innerHTML);

        function normalizeText(text) {
          return text
            .toLowerCase() // Convert to lowercase
            .normalize('NFD') // Decompose accents (é -> e)
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9]/g, '') // Remove special characters, spaces, punctuation
            .trim() // Trim any leading/trailing spaces (just in case)
        }
        // Find the first matching option based on the value
        let options = dropdownContent.querySelectorAll('.basic-typeahead__selectable')
        let inputValue = normalizeText(field.value) // Normalize input value

        let matchedOption = Array.from(options).find((option) => {
          let optionText = normalizeText(option.textContent) // Normalize dropdown option text
          console.log('DROPDOWN Compare::', optionText, inputValue)
          return optionText.includes(inputValue) // Return the comparison result
        })

        if (matchedOption) {
          // console.log('Matched option:', matchedOption.textContent.trim());

          // Select the matched option
          matchedOption.click()
          await delay(500)
        } else {
          console.log('No matching option found for value:', field.value)
          // Select the first option if no match is found
          options[0].click()
          dropdownContent.dispatchEvent(new Event('change', { bubbles: true }))
          await delay(500)
        }
      } else {
        console.log('Dropdown menu did not appear or was not found.', questionContainer)
      }

      // Trigger the change event after selecting the option
      input.dispatchEvent(new Event('change', { bubbles: true }))

      console.log('Set text value with dynamic interaction', { value: field.value })
    } else {
      // Handle the standard text input case
      input.value = field.value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))

      console.log('Set text value', {value: field.value })
    }
  } else {
    console.warn('Text input not found')
  }
}

async function uploadFile(file, button) {
  if (file instanceof File) {
    // Use a more stable selector to find the upload container
    let uploadResumeButton = button // document.querySelector('.js-jobs-document-upload__container');

    if (uploadResumeButton) {
      const fileInput = uploadResumeButton.parentElement.querySelector('input[type="file"]')
      // console.log('Upload container found:', fileInput, uploadResumeButton);

      if (fileInput) {
        // Create a new DataTransfer object
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        // Assign the file to the input element
        fileInput.files = dataTransfer.files

        // Manually trigger the change event to initiate the upload
        const event = new Event('change', { bubbles: true })
        fileInput.dispatchEvent(event)
      } else {
        console.error('Error: File input element not found within the upload container.')
      }
    } else {
      console.error('Error: Upload container not found.')
    }
  } else {
    console.error('Error: Expected File, but received:', file)
  }
  return true
}

// 1
async function getJobInformation() { 
  try {
    // Scrape job title
    let jobTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title h1')
    let postUrl = jobTitle?.closest('a')?.href || window.location.href
    jobTitle = jobTitle?.innerText.trim() || ''

    // Location, reposted time, and number of applicants
    let postInfo = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container')
    let jobLocation = postInfo.querySelectorAll('.tvm__text')?.[0]?.innerText.trim() || ''
    let repostedTime = postInfo.querySelectorAll('.tvm__text')?.[2]?.innerText.trim() || ''
    let applicantsCount = postInfo.querySelectorAll('.tvm__text')?.[4]?.innerText.trim().replace(' applicants', '') || ''

    // Scrape resume link
    let resumeLink = document.querySelector('a[aria-label="Download your submitted resume"]')?.href || ''

    // Scrape hirer information
    let hirerName = document.querySelector('.hirer-card__hirer-information .jobs-poster__name strong')?.innerText.trim() || ''
    let hirerTitle = document.querySelector('.hirer-card__hirer-information .linked-area .text-body-small')?.innerText.trim() || ''

    // Expand the job description if the "See More" button is available
    let seeMoreButton = document.querySelector('button[aria-label="Click to see more description"]')
    if (seeMoreButton) {
      seeMoreButton.click()
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for content to expand
    }

    // Scrape job description
    let jobDescription = (
         document.querySelector('.jobs-description-content__text') 
      || document.querySelector('#job-details')
    )?.textContent.trim() || ''

    // Get Job Info from Post
    let jobDetails = document.querySelector('.job-details-module')?.innerText.replace('Retrieved from the description', '').replace('Details found in the job post', '').replace('\n', '').trim() || ''

    // Scrape salary information
    let salaryContainer = document.querySelector('.jobs-details__salary-main-rail-card')
    let featuredBenefits,
      salaryInfo = ''
    if (salaryContainer) {
      salaryInfo = document.querySelector('div[data-view-name="job-salary-card"] .job-details-module__content')?.innerText.trim().replace('Base salary\n\n', '').replace(' (from job description)', '') || ''
      featuredBenefits =
        Array.from(document.querySelectorAll('.featured-benefits__benefit'))
          .map((item) => item.innerText.trim())
          .join(',') || ''
    }

    // Scrape qualifications
    // let qualifications = Array.from(document.querySelectorAll('.job-details-how-you-match-card__qualification-section-list-item')).map(item => item.innerText.trim()).join(', ') || '';
    let skillMatchDetails = ''
    let skillNoMatchDetails = ''
    let requirements = ''
    let showQualificationsButton = document.querySelectorAll('.job-details-how-you-match-card__container')?.[0]?.querySelector('button')
    if (showQualificationsButton) {
      showQualificationsButton.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
      requirements = Array.from(document.querySelector('.job-details-skill-match-modal__screening-questions-qualification-container')?.querySelectorAll('li') || []).map((item) => item?.innerText.trim().replace('Requirements added by the job poster', ''))
      skillMatchDetails = Array.from(document.querySelectorAll('.job-details-skill-match-status-list__matched-skill') || []).map((item) => item.innerText.trim()) || ''
      skillNoMatchDetails = Array.from(document.querySelectorAll('.job-details-skill-match-status-list__unmatched-skill') || []).map((item) => item.innerText.trim().replace('Add', '').replace('\n', '').replace(', ', '').trim()) || ''
      document.querySelector('.artdeco-modal__dismiss').click()
    }

    // Expand and scrape company info
    let showMoreButton = document.querySelector('.inline-show-more-text__button')
    if (showMoreButton) {
      showMoreButton.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    let companyDescription = document.querySelector('.jobs-company__company-description')?.innerText.trim() || ''

    // Get Company Name
    let companyName = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText.trim() || document.querySelector('.link-without-visited-state')?.innerText.trim() || ''

    // Get Company Followers, Employees, and Employees on LinkedIn
    let followers,
      employeesTotal,
      employeesOnLinkedIn = ''
    let companyInfoContainer = document.querySelector('.jobs-company__box')
    if (companyInfoContainer) {
      followers = companyInfoContainer?.querySelector('.artdeco-entity-lockup__subtitle')?.innerText.replace('followers', '').trim() || ''
      employeesTotal = companyInfoContainer?.querySelectorAll('.jobs-company__inline-information')?.[0]?.innerText.replace('employees', '').trim() || ''
      employeesOnLinkedIn = companyInfoContainer?.querySelectorAll('.jobs-company__inline-information')?.[1]?.innerText.replace('on LinkedIn', '').trim() || ''
    }

    // Return all the scraped information as a JSON object
    let jobInfo = {
      jobTitle,
      postUrl,
      jobLocation,
      repostedTime,
      applicantsCount,
      resumeLink,
      hirerName,
      hirerTitle,
      jobDescription,
      jobDetails,
      salaryInfo,
      featuredBenefits,
      requirements,
      skillMatchDetails,
      skillNoMatchDetails,
      companyDescription,
      companyName,
      employeesOnLinkedIn,
      employeesTotal,
      followers,
    } 
    return jobInfo
  } catch (e) { 
    window.toggleStatusNotification(false)
    return { error: e.message }
  } 
}

// 2.
async function getFormInputsAndDropdowns() {
  window.toggleStatusNotification(true, 'Getting Form Inputs.')
  let container = document.querySelector('.jobs-easy-apply-content') || 
                  document.querySelector('.jobs-easy-apply-modal__content')
  let individualQuestionContainers = container.querySelectorAll('.jobs-easy-apply-form-section__grouping')
  if(individualQuestionContainers.length === 0) { individualQuestionContainers = container.querySelectorAll('.fb-dash-form-element') }

  // console.log('individualQuestionContainers', individualQuestionContainers, container)
                                                                

  let formFields = []
  let index = 0

  individualQuestionContainers.forEach((questionContainer) => {
    let inputElements = questionContainer.querySelectorAll('input, textarea, select')

    let addedFieldsets = new Set() // Track fieldsets we've already processed

    let instructions = false
    let errorElements = questionContainer.querySelectorAll('.artdeco-inline-feedback--error')
    if (errorElements.length > 0) {
      console.log('Error elements found:', errorElements)
      // throw new Error("Failed answering or file upload. " + Array.from(errorElements).map(e => e.textContent).join(", "));
      instructions =
        'Possible error with the given value. Please abide by the following instructions to properly handle this field: ' +
        Array.from(errorElements)
          .map((e) => e.textContent)
          .join(', ')
    }

    inputElements.forEach((element) => {
      let fieldInfo = { fieldIndex: index, element: questionContainer, ...(!instructions ? {} : { instructions }) }
      let fieldType = element.type.toLowerCase()

      if ('textarea,radio,text,checkbox,select-one'.includes(fieldType)) {
        fieldInfo.element = questionContainer
      }
      if (fieldType === 'radio') {
        let radioGroupName = element.name
        if (!formFields.some((field) => field.name === radioGroupName)) {
          let legend = questionContainer.querySelector('legend span[data-test-form-builder-radio-button-form-component__title]')
          fieldInfo.label = legend ? legend.textContent.replace(/\s+/g, ' ').trim() : findLabelText(element)
          fieldInfo.type = 'radio'
          fieldInfo.name = radioGroupName
          fieldInfo.options = Array.from(
            questionContainer.querySelectorAll(`input[type="radio"][name="${radioGroupName}"]`)
          ).map((radio) => ({
            label: findLabelText(radio),
            value: radio.value,
            checked: radio.checked,
          }))
          formFields.push(fieldInfo)
        }
      } else if (fieldType === 'text' || fieldType === 'textarea') {
        fieldInfo.label = findLabelText(element)
        fieldInfo.type = fieldType
        fieldInfo.value = element.value || ''
        formFields.push(fieldInfo)
      } else if (fieldType === 'checkbox') {
        let fieldset = element.closest('fieldset')
        if (fieldset && !addedFieldsets.has(fieldset)) {
          addedFieldsets.add(fieldset) // Ensure each fieldset is only processed once
          let legend = fieldset.querySelector('legend span')
          fieldInfo.label = legend ? legend.textContent.replace(/\s+/g, ' ').trim() : 'Checkbox Group'
          fieldInfo.type = 'checkbox-group'
          fieldInfo.options = Array.from(fieldset.querySelectorAll('input[type="checkbox"]')).map((checkbox) => ({
            label: findLabelText(checkbox),
            value: checkbox.value || checkbox.getAttribute('data-test-text-selectable-option__input'),
            checked: checkbox.checked,
          }))
          formFields.push(fieldInfo)
        }
      } else if (fieldType === 'select-one') {
        fieldInfo.label = findLabelText(element)
        fieldInfo.type = 'dropdown'
        let selectedOption = element.options[element.selectedIndex]
        fieldInfo.value = selectedOption ? selectedOption.text : null
        fieldInfo.options = Array.from(element.options).map((option) => option.text)
        formFields.push(fieldInfo)
      }
    })

    index++
  })
  console.log('SCRAPED: formFields', formFields)
  // await delay(100000)
  return formFields
}

// 3.
async function processFormLinkedIn(formFields) {
  window.toggleStatusNotification(true, 'Processing Form Information.')
  // console.log('PROCESS FORM LINKEDIN', { formFields })

  let resObj = JSON.parse(window.userData?.resumes?.[0]?.text || '{}')
  let bio = window.userData?.bio?.[0]?.text || ''
  let instructions = window?.applySettings?.formFillingInstructions
  console.log('processFormLinkedIn instructions', { instructions})
  let resumetext = resObj.text

  //let formFieldsClone = JSON.parse(JSON.stringify(formFields));
  // formFieldsClone.forEach(field => delete field.element);
  let formFieldsClone = formFields.map((field) => {
    let { element, ...rest } = field // Remove 'element' while keeping other properties intact
    return { ...rest }
  })
  // console.log('PROCESS formFieldsClone LINKEDIN', {formFieldsClone})
  // callChatGPT with a prompt to fill out the formFields using json format. give it a structure to follow.

  let system_message = {
    role: 'system',
    content: `
    <Instructions>
      You will assist with filling out forms from the <FormFields> on behalf of the user. Return the results in valid JSON format only.
      - Process each step methodically. 
      - Always return an object array in the required JSON structure described below and depicted in the <Example_Response>.
      - If <FormFields> is empty or missing, return an empty array.
      - Follow any instructions attached to individual form fields **with absolute priority**.
      - Form-Field level instructions take priorty; Even if they contradict or override any information provided in the <UserResume>, <UserBio>, or <JobDescription>.
      ${instructions}
      - Use context from the <UserResume>, <UserBio>, and <JobDescription>.
      - Follow any specific instructions attached to a form field, even if it overrides an already set value.
      - For dropdown, radio, and checkbox fields, you must select valid, non-default option, if options are provided and a placeholder or default exists.
      - Ensure all dependent questions based on previous answers are correctly filled out.
      - Return the response as an array of objects with these exact keys:
        - label: The label of the input field.
        - type: The type of input field (text, textarea, select, dropdown, radio, checkbox).
        - value: The value for the field, derived using the options or the available information and instructions given.
        - fieldIndex: The index of the field in the form. This will be provided, and you must return it unchanged.
        - options: Must be used for checkboxes, radios, and dropdowns. Return an array of options that require interaction (to be selected or removed). Limit the list to a maximum of 10 options if there are more than that.
        - instructions: If any specific instructions are attached to a form field, follow them with the utmost priority and include them in the response and provide an answer to the field as per the instructions. If a text field has specific instructions, the response may not be blank and must be an new value.
      - Important: Do not include any extra data or keys in the response. Exclude the 'options' key if not required (for text or textarea fields)
    </Instructions> 
    <Example_Response>
    {formFields: [
      { "fieldIndex": 0, "label": "First name", "type": "text", "value": "John" },
      { "fieldIndex": 1, "label": "Do you require sponsorship for employment visa status?", "type": "radio", "value": "No", "options": [ {"label": "Yes","value": "Yes","checked": false}, {"label": "No","value": "No","checked": true}] },
      { "fieldIndex": 2, "label": "What are your compensation expectations for this role?", "type": "text", "value": "250000", "instructions": "Enter a decimal number" },
       ...
    ]}
    </Example_Response>
    <HANDLING_SPECIAL_INSTRUCTIONS>  
      If additional instructions are attached to a form field, follow the instructions with the utmost priority, particularly relating to input formatting, type and validation. Provide values in the exact format requested. 
      Fields with specific instructions must return an updated value that adheres to the instructions provided and may not be the same as the original. For checkboxes and radio buttons, this means the selections must change. 
    </HANDLING_SPECIAL_INSTRUCTIONS>
  `,
  }

  let user_message = {
    role: 'user',
    content: `
    <UserResume>${resumetext}</UserResume>
    <UserBio>${bio}</UserBio>
    <JobDescription>${JSON.stringify(window.jobPost)}</JobDescription>
    <FormFields>${JSON.stringify(formFieldsClone)}</FormFields>
  `,
  }
  // console.log('processFormLinkedIn passing ChatGPT: ', {resumetext, 'obj': window.userData, bio, 'appLinkedInfo': window.jobPost })

  let post = [system_message, user_message]
  const message = await callChatGPT(post, 'gpt-4o-mini', 4096, false, false)
  let formFieldsResponse = message

  // Fill out the formFields
  console.log('processFormLinkedIn', { formFieldsResponse })
  let newformFields = JSON.parse(formFieldsResponse).formFields
  newformFields.forEach((field) => (field.element = formFields.find((orig) => orig.fieldIndex === field.fieldIndex)?.element))
  console.log('processFormLinkedIn', { formFields, newformFields })
  return newformFields
}

// 4.
async function fillLinkedInForm(formFields) { 
  window.toggleStatusNotification(true, 'Filling Form.')

  for (const field of formFields) {
    // console.log('Processing field', { label: field.label, type: field.type, value: field.value });

    let questionContainer = field.element

    if (questionContainer) {
      switch (field.type) {
        case 'text':
          await handleTextInput(field, questionContainer)
          break

        case 'textarea':
          await handleTextareaInput(field, questionContainer)
          break

        case 'dropdown':
          await handleDropdownInput(field, questionContainer)
          break

        case 'radio':
          await handleRadioInput(field, questionContainer)
          break

        case 'checkbox-group':
          await handleCheckboxGroupInput(field, questionContainer)
          break

        default:
          console.error('Unknown field type', {type: field.type })
      }
    } else {
      console.error('Question container not found', )
    }
  }

  console.log('fillForm completed')
  return
} 