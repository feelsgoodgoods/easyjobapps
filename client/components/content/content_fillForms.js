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
  const message = await callChatGPT(prompt, 'gpt-4.1-mini', 4096, false, false)
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

// used by refine_yaml
const generatePrompt = (content) => {
  let {
    type,
    applicantText,
    resumeText,
    jobDescription,
    bio,
    templateContent,
    instructions, 
    error = false,
    invalidYAML = ''
  } = content;
 
  // Set up system and user messages for ChatGPT
  let system_message = {
    role: 'system',
    content: `
      You convert job <ApplicantText> into a valid YAML ${type} using a Pandoc <LatexTemplate> they provide to help inform you of the YAML structure. 
      <ProcessingInstructions>
        The YAML must be valid and structured so that it may be used in a Pandoc YAML metadata block within an otherwise empty markdown (.md) file which will then be used to populate the <LatexTemplate>.
        1. The YAML must start and end with "---".
        2. It should be indented and formatted for direct use by Pandoc as metadata.
        3. Only return valid YAML frontmatter — no additional text or markdown. 
        4. Every item in list fields like jobs.items, awards, and tools must be a YAML string scalar.
        5. If any list item contains a colon ":" anywhere in the text, wrap the entire item in double quotes.
        6. Never emit list items as key-value mappings unless the schema explicitly asks for an object.
        7. Never output control or non-printing characters (for example: U+0088, \x88, or odd bullet glyphs).
        8. Never output standalone boolean/null tokens as list items (true/false/null/yes/no/on/off), especially inside jobs.items.
        9. jobs.items must be human-readable accomplishment statements, never placeholders or scalar literals.
        10. Colons are allowed only for YAML key-value syntax. Do not include ":" inside any generated value text (for example in jobs.items, summary, awards, tools, or other string values); rewrite phrasing to avoid in-value colons.
  
        Your output will be inserted into a markdown file and used in the following Pandoc command for PDF generation:
        cmd = ['pandoc', md_filename, '--template', <LatexTemplate>]
  
        Strictly return valid YAML format that Pandoc can process.
      </ProcessingInstructions>
      The user may want you to tailor their ${type}  for a specific <JobDescription> they are applying for.
      Before you begin ask for the <ApplicantsBio> ${!!resumeText && ', <ResumeText>'}, a <JobDescription> for which the applicant is applying to, and <FinalInstructions>.
      Do not confuse the <JobDescription> that they are applying to as a part of their work experience.
      `,
  }

  let user_messageOne = {
    role: 'user',
    content: `I am applying for a job. Here is my ${type}: <ApplicantText>${applicantText}</ApplicantText>`,
  }

  let assistant_messageOne = {
    role: 'assistant',
    content: `Thank you for providing your ${type}.`,
  }

  // Send to ChatGPT for YAML generation
  let prompt = [system_message, user_messageOne, assistant_messageOne]

  if (!!resumeText) {
    let assistant_messageResume = {
      role: 'assistant',
      content: `Please provide your resume, if available.`,
    }
    let user_messageResume = {
      role: 'user',
      content: `<ResumeContent>${resumeText}</ResumeContent>`,
    }

    prompt.push(assistant_messageResume, user_messageResume)
  }

  let assistant_messageTwo = {
    role: 'assistant',
    content: `If you are applying to a specific job, please provide any information about it, if available.`,
  }

  let user_messageTwo = {
    role: 'user',
    content: `${jobDescription&&'Here is information I was able to gather about the job I am applying for: '}<JobDescription>${jobDescription}</JobDescription>`,
  }

  let assistant_messageThree = {
    role: 'assistant',
    content: `Thank you. 
    I understand the job description is for a job you want to apply to and not a job you currently have. 
    I will consider the JobDescription when drafting the final output. 
    Now, please provide the applicant's bio which I may use, to further help.`,
  }

  let user_messageThree = {
    role: 'user',
    content: `${bio&&'Here is more information about myself if that helps:'}<ApplicantsBio>${bio}</ApplicantsBio>`,
  }

  let assistant_messageFour = {
    role: 'assistant',
    content: `Thank you! Finally, please provide the Pandoc template you want me to use.`,
  }

  let user_messageFour = {
    role: 'user',
    content: `<LatexTemplate>${templateContent}</LatexTemplate>`,
  }

  let assistant_messageFive = {
    role: 'assistant',
    content: `Fantastic, please provide the <FinalInstructions> for the YAML conversion to begin.`,
  }

  let user_messageFive = {
    role: 'user',
    content: `<FinalInstructions>
        - Do not confuse the job description as a part of the resume.
        - Use the <ApplicantText> as the foundation for your response using the <JobDescription> to help inform your response.
        - Retain the tone and writing style of the original <ResumeText>, and text where possible.
        ${instructions}</FinalInstructions>`,
  }

  // If there's an error, augment the prompt with error message and invalid YAML
  if (error) {
    system_message.content += `
      The previous YAML submission resulted in a Pandoc processing error.
      Error: ${error}
  
      Invalid YAML that caused the error:
      ${invalidYAML}
  
      Please review the above invalid YAML and the error message to fix the issue, and provide a corrected version that is valid for Pandoc processing.
      `
  }

  prompt.push(assistant_messageTwo, user_messageTwo, assistant_messageThree, user_messageThree, assistant_messageFour, user_messageFour, assistant_messageFive, user_messageFive)
 
  return prompt 
}

const quoteYamlScalar = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

const stripControlCharacters = (value) => {
  // Keep newline/tab semantics intact while removing control glyphs that break PDF output.
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
}

const dequote = (value) => {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

const isYamlBooleanLike = (value) => /^(true|false|null|yes|no|on|off)$/i.test(value)

const sanitizeYamlListItems = (yamlText) => {
  const lines = stripControlCharacters(yamlText).split('\n')
  let itemsIndent = null

  const sanitizedLines = lines
    .map((line) => {
      const cleanLine = stripControlCharacters(line)
      const lineIndent = (cleanLine.match(/^\s*/) || [''])[0].length

      if (/^\s*items:\s*$/.test(cleanLine)) {
        itemsIndent = lineIndent
        return cleanLine
      }

      if (
        itemsIndent !== null &&
        lineIndent <= itemsIndent &&
        cleanLine.trim() !== '' &&
        !/^\s*#/.test(cleanLine)
      ) {
        itemsIndent = null
      }

      const match = cleanLine.match(/^(\s*-\s+)(.*)$/)
      if (!match) return cleanLine

      const prefix = match[1]
      const value = match[2].trim()
      if (!value) return null

      const unquotedValue = dequote(value)

      // Hard drop invalid placeholder bullets that should never be rendered in work-history lists.
      if (itemsIndent !== null && isYamlBooleanLike(unquotedValue)) return null

      if (/^["'].*["']$/.test(value)) {
        return `${prefix}${quoteYamlScalar(unquotedValue)}`
      }

      const shouldQuote = value.includes(':') || isYamlBooleanLike(unquotedValue)
      return shouldQuote ? `${prefix}${quoteYamlScalar(unquotedValue)}` : `${prefix}${unquotedValue}`
    })
    .filter((line) => line !== null)

  return sanitizedLines.join('\n')
}
  
async function refine_yaml(body) {
  const { type, givenText = false, error = false, invalidYAML = '' } = body 
  console.group('\n\n Content:Refine Yaml:') 

  // console.log({ 
  //   jobPost: window.jobPost, // .text = {jobDescription, jobDetails, applicantCount, ... } 
  //   applySettings: window.applySettings, // false
  //   postData: window.postData, // false  
  //   editorData: window.editorData, // .resume = {id, title, text, file, latexText, tailorText, template }
  //   userData: window.userData, // .resumes[0] = {id, label, text: {id, title, text, file, latexText, tailorText, template } } 
  // })

  // Retrieve 
  const jobPostText = window.jobPost?.text || ''
 
  // Retrieve content from window
  const resObj = window.editorData?.resume || JSON.parse(window.userData?.resumes?.[0]?.text || '{}') 
  const covObj = window.editorData?.coverletter || JSON.parse(window.userData?.resumes?.[0]?.text || '{}') 
  const docObj = type === 'resume' ? resObj : covObj  

  // Get Content 
  const instructions = docObj?.tailorText || ''   
  const templateContent = await getTemplate(resObj)
  const applicantText = docObj?.text; 
  const resumeText = type != 'coverletter' ? false : resObj.text  
  const jobDescription = (typeof jobPostText == 'string') ? jobPostText : JSON.stringify(jobPostText)
  const bio = window.userData?.bio?.[0]?.text || ''

  // console.table(
  //   {
  //     resObj,
  //     covObj,
  //     docObj,
  //   }
  // )
  let content = {
    type,
    applicantText,
    resumeText,
    jobDescription,
    bio, 
    templateContent,
    instructions,
    error,
    invalidYAML 
  }
  console.table( content )  
  console.groupEnd()
 
  let post = generatePrompt( content )

  const message = givenText || (await callChatGPT(post, 'gpt-4.1-mini', 4096, false, true)) 
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

    yamlHeader = sanitizeYamlListItems(yamlHeader)
  }

  // console.group('Refine Yaml:END')
  // console.log('Refine Yaml:', { yamlHeader })
  // console.groupEnd()
  return { yamlContent: yamlHeader }
}
 
// uses resumeText yaml if in postData
async function generateResume(givenText = false, error = false, invalidYAML = '') {
  // console.log('generateResume userData:', userData?.editorData?.resume, window.postData)  
  const activeTab = 'resume'

  let startTime = new Date().getTime() 
  const resp_text = await refine_yaml({type:'resume', givenText}) 
  const yamlHeader = resp_text?.['yamlContent']  
  if (!yamlHeader) { console.log(`No ${activeTab} content received`, { resp_text }); return }  
  
  const resEditor = window.editorData?.resume   
  const template = await getTemplate(resEditor)

  // Log time
  let endTime = new Date().getTime()
  let lapseInSeconds = ((endTime - startTime) / 1000).toFixed(2)
  console.log(`generateResume took ${lapseInSeconds} seconds`, {yamlHeader})

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