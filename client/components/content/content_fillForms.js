// Not LinkedIn
let generatedCoverLetter = null
let generatedResume = null 
let sendGenerated = async (type, text, base64EncodedData) => {   
  // check if window.postData is set or if it is false or if it is a promise
  let postData = window.postData || false
  if(postData && postData.then){ console.log('waiting to resolve'); postData = await postData }
  if(!postData){ console.log('no postData'); return }  

  console.log('Sending Doc to SW', {postData, type, text})  
  window.postData = {
    ...postData,
    [type]: text,
    [type + '64']: base64EncodedData,
  }
  response = await chrome.runtime.sendMessage({ 
    toAppAction: 'handleAutoApply', 
    data : { postData, type, text, base64EncodedData} 
  }); 

  console.log('toAppAction handleAutoLoad RETURNED:', response)
} 


async function processForm(formData) {
  // console.groupCollapsed('Process Form')
  console.log('Process Form')
  let jobdescription = JSON.stringify(window.jobPost)
  let resObj = JSON.parse(window.userData?.resumes?.[0]?.text || '{}')
  let bio = window.userData?.bio?.[0]?.text || ''
  let resumetext = resObj.text
  // console.log('Process Form:', { userData: window.userData, resumetext })
  let prompt = [
    {
      role: 'system',
      content: `Your job is to complete online job application forms and return valid json. { data : [] } 
        To help, you will be give  the job post as well as the applicants bio and resume. 
        You can make educated guesses. Some questions are based on a prior question so be sure to answer all questions.
        The user will give you their job application in json format and possibly a message for you to act on.
        What you return should look like: 
        data : [ 
            { 
                getElementById: input id || false, 
                querySelector, 
                type: string => ['file', 'text', 'input', 'select', 'textbox', 'textarea', 'email', 'radio', 'checkbox', 'textarea'],
                informationRequested: string, 
                userSelection: string || options: [ { optionSelector, optionDisplayText, value}, ... ] 
            }, ... 
        ]
        Where  
        getElementById - id of input. Required if present. 
        userSelection - Contains Text to respond with for text fields or an object array containing information on the Radio buttons, checkboxes, dropdop options, or elements to select.
        userSelection:optionSelector - A well formed query selector to get the option to select.
        userSelection:optionDisplayText - The displayed label for the option. 
        userSelection:value - The value set for the option. 

        If the given text is not a job application form, return { data : [] } }

        If a Resume or Cover Letter is requested and you are given the option of how, opt for uploading an attachment where possible where the type should be set to 'file' and the querySelector and getElementById should be set to the id of the file input.
        `,
    },
    {
      role: 'system',
      content: `
        Here is the applicants bio:
        ${bio}
    
        Here is the applicants resume:
        ${resumetext}

        Here is the Job Post
        ${jobdescription}
    `,
    },
    { role: 'user', content: JSON.stringify(formData) },
  ]

  // log prompt as a table
  console.log('PROMPT:')
  console.table(prompt)
  window.toggleStatusNotification(true, 'Thinking...')

  // console.log('message', message)
  // Parse the response and return the filled form fields
  const message = await callChatGPT(prompt, 'gpt-4o-mini', 4096, false, false)
  console.log('RESPONSE len:' + message.length)
  // console.log(message)
  let data = JSON.parse(message).data
  console.table(data)

  // Look for resume and cover letter fields
  let gotdata = await data?.map((field) => {
    // console.log('Field:', field, field.type)
    if (field.type == 'file') {
      let checkHas = (attr, str) => field[attr]?.toLowerCase().includes(str)
      // console.group('File Field')
      // console.log('File Field:', field, field.type, field.id)
      if (checkHas('informationRequested', 'resume') || checkHas('id', 'resume') || checkHas('querySelector', 'resume')) {
        window.toggleStatusNotification(true, 'Generating Resume')        
        generatedResume = generateResume()
        field.fileName = 'resume.pdf'
      }
      if (checkHas('informationRequested', 'letter') || checkHas('id', 'letter') || checkHas('querySelector', 'letter')) {
        window.toggleStatusNotification(true, 'Generating Coverletter')
        generatedCoverLetter = generateCoverLetter()
        field.fileName = 'coverletter.pdf'
      }
      // console.groupEnd()
    }
    return field
  })
  let returnThis = await Promise.all(gotdata)

  console.log('Process Form: Return', returnThis)
  // console.groupEnd()
  return returnThis
}

window.fillForms = async function fillForms(request) {
  let fillFormsOptions = JSON.parse(request.fillFormsOptions)
  console.group('Fill Form(s)')

  let result = await Promise.all(fillFormsOptions.map(async (formField) => fillField(formField)))

  console.log('FINISHED!!')

  console.groupEnd()
  return result
}

let fillField = async (formField) => {
  {
    let { getElementById, querySelector, type, informationRequested, userSelection, fileName } = formField

    function escapeSelector(selector) {
      if (!selector || selector.trim() === '#') {
        return
      }
      return selector.replace(/\[\]/g, '\\[\\]')
    }

    let dispatch = (el) => {
      el.blur() // Blur to simulate "leaving" the input
      el.focus() // Refocus to simulate "re-entering"
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.blur() // Blur to simulate "leaving" the input
    }

    // Sync React’s internal state with the last value
    const setReactInputValue = (el, newValue) => {
      // console.log('setReactInputValue:', { el, newValue })
      const lastValue = el.value
      el.value = newValue
      const tracker = el._valueTracker
      if (tracker) {
        tracker.setValue(lastValue)
      }
      dispatch(el)
    }

    // Jobs Boards Greenhouse
    let handleDropdownTextBox = async (el, value) => {
      const attemptSelection = () => {
        const dropdownMenu = el.closest('.select').querySelector('.select__menu-list')
        if (dropdownMenu) {
          const firstOption = dropdownMenu.querySelector('.select__option')
          if (firstOption) {
            firstOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            return true
          }
        }
        return false
      }

      let retries = value.length - 1
      let val = value
      while (retries > 0) {
        setReactInputValue(el, val)
        await delay(100) // Small delay to allow framework to process input
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        await delay(1000) // Allow dropdown rendering to occur
        if (attemptSelection(el)) {
          return
        }
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        val = val.slice(0, -1)
        retries--
      }
      // console.log('Failed to select an option after reducing input.')
    }

    let handleSelection = (selection) => {
      console.log('handleSelection:', { informationRequested, el, selection })
      if (!selection) {
        console.log('No Selection Found', informationRequested, el)
        return
      }
      let optionSelector = escapeSelector(selection.optionSelector)
      if (!optionSelector) {
        console.log('Invalid optionSelector skipped:', selection.optionSelector)
        return
      }
      let option = document.querySelector(optionSelector)
      if (!option) {
        console.log('Option Not Found')
        return
      }
      // check if option is radio or checkbox first
      if (type === 'radio' || type.includes('checkbox')) {
        if (option.type === 'radio' || (option.type.includes('checkbox') && !option.checked)) {
          option.click()
        }
        dispatch(option)
      }
    }

    // Handle file input (resume/cover letter)
    let uploadFile = async (el, base64data) => {
      let fileContent = await new Promise(async (resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(base64data)
      })

      // console.log('File:', { fileName })
      // console.log('File Content:', fileContent)

      const byteCharacters = atob(fileContent.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const file = new File([blob], fileName, { type: 'application/pdf' })
      // console.log('- - FILE:', file);

      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)

      console.log('File:', { fileName, file, el })
      el.files = dataTransfer.files

      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))

      // const fileURL = URL.createObjectURL(file)
      // window.open(fileURL, '_blank');
      return true
    }

    getElementById = getElementById && getElementById.startsWith('#') ? getElementById.slice(1) : getElementById
    let el = document.getElementById(getElementById)
    if (!el) {
      // console.log('Element Not Found Using ID:', getElementById, 'Trying Query Selector:', querySelector, { informationRequested })
      const safeSelector = escapeSelector(querySelector)
      if (safeSelector) {
        try {
          el = document.querySelector(safeSelector)
          if (!el) {
            console.log('Element Not Found Using Query Selector:', safeSelector)
            return false
          }
        } catch {
          // console.log('ERROR: Query Selector:', safeSelector)
          return false
        }
      } else if (type != 'radio' && type != 'checkbox') {
        console.log('ERROR: Query Selector 2:', safeSelector)
        return false
      }
    }

    // console.log('Fill Form:', { informationRequested, type, el })

    // Handle input, textarea, etc.
    if (['input', 'text', 'textbox', 'textarea', 'email'].includes(type)) {
      if (!el) {
        console.error('Element Not Found:', { userSelection })
        return
      }
      el.value = userSelection
      dispatch(el)
      el.click()
      let isComboBox = el.getAttribute('role') === 'combobox'
      if (isComboBox) {
        handleDropdownTextBox(el, userSelection)
      }
    }

    // Handle select elements
    if (type === 'select') {
      console.log('Select:', { el, userSelection })
      try {
        // if (type === "dropdown") { option.selected = true; }
        el.value = userSelection.value
        el.dispatchEvent(new Event('change', { bubbles: true }))
      } catch {
        console.log('Error Dispatching Event')
      }
      console.log('Selected option for select element.')
      return
    }

    // Handle radio and checkbox
    if (typeof userSelection === 'object') {
      if (Array.isArray(userSelection) && userSelection.length > 0) {
        userSelection.forEach((selection) => handleSelection(selection))
      } else {
        handleSelection(userSelection)
      }
    }

    if (type === 'file' && fileName) {
      window.toggleStatusNotification(true, `Generating Upload Files.`)
      let base64data = fileName.includes('Resume') ? await generatedResume : fileName.includes('Coverletter') ? await generatedCoverLetter : null

      if (base64data) {
        await uploadFile(el, base64data) // Wait for uploadFile to complete
      }
    }
    return true // Ensure the function completes after all operations
  }
}

let compressed = localStorage.getItem('compressedRes') || ''
let expanded = localStorage.getItem('expandedRes') || ''

const getEditorIds = () => {
  let resumeId = userData?.editorData?.resume.id
  let coverletterId = userData?.editorData?.coverletter.id
  return { resumeId, coverletterId }
}

const getTemplate = async (editor) => { 
  
  const domain = window.devSettings.localServer ? 'http://127.0.0.1:3002' : 'https://getfrom.net'
  const templateName = editor?.template
  let useCompressed = (templateName == 'None' || templateName == 'Compressed')

  if (useCompressed){
    useCompressed = compressed || (compressed = await fetchResource(`${domain}/compressed.txt`).then((response) => response.text())) 
    localStorage.setItem('compressedRes', useCompressed)
  }

  let useExpanded = templateName == 'Expanded'
  if (useExpanded){
    useExpanded = expanded || (expanded = await fetchResource(`${domain}/expanded.txt`).then((response) => response.text()))
    localStorage.setItem('expandedRes', useExpanded)
  }

  let useDouble = templateName == 'Double'
  if (useDouble){
    useDouble = await fetchResource(`${domain}/double.txt`).then((response) => response.text())
  }

  const useAdvanced = templateName == 'Advanced' && window.userData?.latexText  
  const template = useCompressed || useExpanded || useAdvanced 

  return template
}

async function refin_yaml(givenText = false, error = false, invalidYAML = '') { 
  const resEditor = window.editorData?.resume   
  console.log('\n\n Content:Fillforms:Refine Yaml:') 
 
  const instructions = resEditor?.tailorText || ''  
  const template = await getTemplate(resEditor)
  const resumetext = resEditor.text
  const bio = window.userData?.bio?.[0]?.text || ''
  const text = window.jobPost?.text
  // console.table({type: typeof(text), jobPostText:text}) 
  const jobdescription = text == 'string' ? text : JSON.stringify(text)

  console.table( {
    instructions,  
    template, 
    resumetext,
    bio,
    jobdescription
  })  

  // Set up the system and user messages for the AI
  let system_message = {
    role: 'system',
    content: `
    <Instructions>
      You assist in generating resumes in YAML format. 
      
      You already have the <ApplicantsBio> and <ResumeText> and the applicant will give you a new <JobDescription> to work off of and a special <ApplicantMessageToYOU>.
  
      The YAML must be valid and structured for a Pandoc YAML metadata block within an otherwise empty markdown (.md) file to populate the <LatexTemplate>.
  
      Guidelines:
      1. The YAML must start and end with "---".
      2. It should be indented and formatted for direct use by Pandoc as metadata.
      3. Only return valid YAML frontmatter — no additional text or markdown.

      Processing Instructions:
      ${instructions}
  
      Your output will be inserted into a markdown file and used in the following Pandoc command for PDF generation:
      cmd = ['pandoc', md_filename, '--template', <LatexTemplate>]
  
      Strictly return valid YAML format that Pandoc can process.
    </Instructions>
    <LatexTemplate>${template}</LatexTemplate>
    <ResumeText>${resumetext}</ResumeText>
    <ApplicantsBio>${bio}</ApplicantsBio>
    `,
  }

  let user_message = {
    role: 'user',
    content: `
    <JobDescription>${jobdescription}</JobDescription>  
    `,
  } 

  // If there's an error, augment the prompt to AI with the error message and invalid YAML
  if (error) {
    system_message.content += `
    The previous YAML submission resulted in a Pandoc processing error.
    Error: ${error}

    Invalid YAML that caused the error:
    ${invalidYAML}

    Please review the above invalid YAML and the error message to fix the issue, and provide a corrected version that is valid for Pandoc processing.
    `
  }

  // Send to ChatGPT for YAML generation
  let post = [system_message, user_message]
  const message = givenText || (await callChatGPT(post, 'gpt-4o-mini', 4096, false, true)) 
  if (typeof message === 'object' && message.error) { return message }
  let yamlHeader = message.trim()
  if(yamlHeader){
    // Strip any extra formatting around the YAML returned by ChatGPTprefix = '```'
    let prefix = false
    prefix = 'yaml'
    if (yamlHeader.startsWith(prefix)) {
      yamlHeader = yamlHeader.slice(prefix.length).trim()
    }
    prefix = '```'
    if (yamlHeader.startsWith(prefix)) {
      yamlHeader = yamlHeader.slice(prefix.length).trim()
    }
    prefix = 'yaml'
    if (yamlHeader.startsWith(prefix)) {
      yamlHeader = yamlHeader.slice(prefix.length).trim()
    }

    let suffix = '```'
    if (yamlHeader.endsWith(suffix)) {
      yamlHeader = yamlHeader.slice(0, -suffix.length).trim()
    }
  }
  return { yamlContent: yamlHeader }
}
 
// uses resumeText yaml if in postData
async function generateResume(givenText = false, error = false, invalidYAML = '') {
  // console.log('generateResume userData:', userData?.editorData?.resume, window.postData)  
  const activeTab = 'resume'

  let startTime = new Date().getTime() 
  const resp_text = await refin_yaml(givenText) 
  const yamlHeader = resp_text?.['yamlContent']  
  if (!yamlHeader) { console.log(`No ${activeTab} content received`, { resp_text }); return }  
  
  const resEditor = window.editorData?.resume   
  const template = await getTemplate(resEditor)

  // Log time
  let endTime = new Date().getTime()
  let lapseInSeconds = ((endTime - startTime) / 1000).toFixed(2)
  console.log(`Operation took ${lapseInSeconds} seconds`, {yamlHeader})

  // Send the YAML and LaTeX template to Pandoc for PDF generation
  const pandoc_url = window.devSettings.localPandoc ? 'http://127.0.0.1:4422/pandoc' : 'https://getfrom.net/pdf/pandoc'

  let response = await fetchResource(pandoc_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: yamlHeader, // The YAML text generated by GPT
      latex: template, // The LaTeX template
    }),
  })

  // If the Pandoc conversion fails
  if (!response.ok) {
    console.log('ERROR GENERATING RESUME', { template })
    console.log('url:', pandoc_url)
    console.log('Response:', response)

    // Retrieve the error message and invalid YAML
    const errorMessage = await response.json()
    console.log('Pandoc Error:', errorMessage)

    // Retry with error correction, passing the error message and the invalid YAML
    if (!error) {
      console.log('Retrying with error handling...')
      return await generateResume(resumetext, errorMessage.error, resumetext)
    } else {
      console.log('SECOND ERROR, TERMINATING...')
      return false
    }
  }

  // If the Pandoc conversion is successful, retrieve the Blob (PDF content)
  const blob = await response?.blob?.()
  if (!blob) {
    console.log('NO BLOB')
    console.log(await response.json())
    return false
  }

  // Save the Blob as a base64-encoded string in localStorage
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onloadend = function () {
    const base64data = reader.result
    localStorage.setItem('resumePdfBase64', base64data)

    sendGenerated('resume', yamlHeader, base64data)

    // create a hyperlink and click it to download the PDF
    const a = document.createElement('a')
    a.href = base64data
    a.download = 'resume.pdf'
    a.click()
  }
  return blob
}

async function generateCoverLetter(givenText = false) {
  console.log('Generate Cover Letter')
  let resObj = JSON.parse(window.userData?.resumes?.[0]?.text || '{}')
  let clObj = JSON.parse(window.userData?.coverletters?.[0]?.text || '{}')
  givenText = givenText || window?.postData?.coverletterText
  givenRes = window?.postData?.resumeText
  let bio = window.userData?.bio?.[0]?.text || ''
  let coverlettertext = givenText || clObj.text
  let resumetext = givenRes || resObj.text
  let instructions = window.applicantmessage
  const domain = window.devSettings.localServer ? 'http://127.0.0.1:3002' : 'https://getfrom.net'
  const templateName = clObj?.template
  const useCompressed = (templateName == 'None' || templateName == 'Compressed') && (await fetchResource(`${domain}/compressed_cl.txt`).then((response) => response.text()))
  const useExpanded = templateName == 'Expanded' && (await fetchResource(`${domain}/expanded_cl.txt`).then((response) => response.text()))
  const useAdvanced = templateName == 'Advanced' && window.userData?.latexText
  let template = useCompressed || useExpanded || useAdvanced
  let jobdescription = window.jobPost

  let system_message = {
    role: 'system',
    content: ` 
    <Instructions>
      You assist in generating cover letters in YAML format, provided with a <JobDescription>, <ApplicantsBio>, and <ResumeText>.
      
      The YAML must be valid and structured for a Pandoc YAML metadata block within an otherwise empty markdown (.md) file to populate the <LatexTemplate>.
      
      Guidelines:
      1. The YAML must start and end with "---".
      2. It should be indented and formatted for direct use by Pandoc as metadata.
      3. Only return valid YAML frontmatter — no additional text or markdown.

      Processing Instructions: 
      ${instructions}
      
      Your output will be inserted into a markdown file and used in the following Pandoc command for PDF generation:
      cmd = ['pandoc', md_filename, '--template', <LatexTemplate>]
      
      Strictly return valid YAML format that Pandoc can process.
    </Instructions>
    <LatexTemplate>${template}</LatexTemplate>
    <ResumeText>${resumetext}</ResumeText>
    <CoverLetterText>${coverlettertext}</CoverLetterText>
    <ApplicantsBio>${bio}</ApplicantsBio>
  `,
  }
  let today = new Date()
  let user_message = {
    role: 'user',
    content: `
    <TodaysDate>${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}</TodaysDate>
    <JobDescription>${jobdescription}</JobDescription> 
    `,
  }

  let post = [system_message, user_message]
  const message = givenText || (await callChatGPT(post, 'gpt-4o-mini', 4096, false, true))
  let coverletterText = message

  // pass to pdflatex
  let url = window.devSettings.localPandoc ? 'http://127.0.0.1:4422/pandoc' : 'https://getfrom.net/pdf/pandoc'
  let prefix = '```'
  if (coverletterText.startsWith(prefix)) {
    coverletterText = coverletterText.slice(prefix.length).trim()
  }
  prefix = 'markdown'
  if (coverletterText.startsWith(prefix)) {
    coverletterText = coverletterText.slice(prefix.length).trim()
  }
  prefix = 'yaml'
  if (coverletterText.startsWith(prefix)) {
    coverletterText = coverletterText.slice(prefix.length).trim()
  }
  let suffix = '```'
  if (coverletterText.endsWith(suffix)) {
    coverletterText = coverletterText.slice(0, -suffix.length).trim()
  }
  const response = await fetchResource(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: coverletterText, //temptext,   // The YAML text
      latex: template, // The LaTeX template
    }),
  })

  if (!response.ok) {
    console.log('ERROR GENERATING Cover Letter', { template })
  }

  // Retrieve the Blob (PDF content)
  const blob = await response?.blob?.()
  if (!blob) {
    console.log('NO BLOB')
    console.log(await response.json())
    return false
  }

  // Save Blob to localStorage
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onloadend = function () {
    const base64data = reader.result
    // sendGenerated('coverletter', coverletterText, base64data)
    localStorage.setItem('coverletterPdfBase64', base64data)

    // create a hyperlink and click it to download the PDF
    const a = document.createElement('a')
    a.href = base64data
    a.download = 'coverletter.pdf'
    a.click()
  }
  return blob
}

function base64ToBlob(base64, contentType) {
  const byteCharacters = atob(base64.split(',')[1])
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  return new Blob(byteArrays, { type: contentType })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
 
  // console.log({ 
  //   givenText, 
  //   postData: window.postData, 
  //   userData: window.userData, 
  //   editorData: window.editorData, 
  //   jobPost: window.jobPost, 
  //   applySettings: window.applySettings, 
  //   appLinkedInfo: window.jobPost 
  // }) 

// create an onload event
// window.onload = async function() { await autoApply () }

// Event Listener

// let removeHighlight = (event) => { event.target.style.border = ""; }
// let highlightElement = (event) => { event.target.style.border = "2px solid red"; }
// document.addEventListener("mouseover", highlightElement );
// document.addEventListener("mouseout", removeHighlight);
// document.addEventListener("click", changeBackgroundAndLog, true);
/*function changeBackgroundAndLog(event) {
    console.log("CHANGE");
    // while (container.firstChild) { container.removeChild(container.firstChild); }
    let selected = event.target;
    let iframe = selected.tagName.toLowerCase() === "iframe" ? selected : selected.querySelector("iframe");
    if (iframe) {
      console.log("iframe", iframe);
      delete request.postupload; 
    } 
    else { 
      console.log('Formn Selected. Calling Fill Form:')
      fillForm({ ...request, selected: selected.outerHTML }); 
    }
    container.appendChild(log);
    document.removeEventListener("mouseover", highlightElement);
    document.removeEventListener("mouseout", removeHighlight);
    document.removeEventListener("click", changeBackgroundAndLog, true);
    //  document.querySelectorAll("*").forEach(el => { if (el.style.border === "2px solid red") { el.style.border = ""; } });
    selected.style.border = "";
    selected.style.background = "rgba(173, 216, 230, 0.5)";
    event.preventDefault();
    event.stopPropagation();
  }*/

  // if(window.userData.jwt){ 
  //   console.log('Sending Doc to Server')
  //   const domain = window.devSettings.localServer ? 'http://127.0.0.1:3002' : 'https://getfrom.net'  
  //   let response = await fetchResource(domain + '/extension_post_update', {  // UPDATE POST_CREATE RESUME/ COVERLETTER TEXT
  //     method: 'POST',
  //     headers: { 
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${jwt}`
  //     },
  //     body: JSON.stringify({post_id:postData.id, type, [type]:text}),
  //   }) 
  //   response = await response.json()  
  //   console.log('sendGenerate - extension_post_update - Response:', response)
  //   resp = response?.data  
  //   chrome.runtime.sendMessage({ toAppAction: 'handleAutoApply', data : { postData: resp,  type:type, base64EncodedData} });  
  // }
  // else{
  // } 