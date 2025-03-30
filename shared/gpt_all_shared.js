console.log('gpt all shared.js')
async function refine_yaml(body) {
  const { type, companyid, postid, user_id, editorData, oaikey, error = false, invalidYAML = '' } = body
  console.group('shared:gpt:refine_yaml:', type)

  // Retrieve content from the params
  const resObj = editorData.resume
  const covObj = editorData.coverletter
  const docObj = type === 'resume' ? resObj : covObj
  // console.log('REFINE YAML GIVEN', {docObj, resObj, covObj})

  // Retrieve content from the database
  const fromdb = await db.getContent(body)
  const { post, defaultBio } = fromdb
  // console.log('refine_yam RETRIEVED FROM DB', {fromdb});

  // Retrieve the template
  const domain = r_endpoint()
  const cl = type === 'coverletter' ? '_cl' : ''
  console.log('DOMAIN GOT:', domain)
  const useCompressed = (docObj.template === 'None' || docObj.template === 'Compressed') && (await fetch(`${domain}/compressed${cl}.txt`).then((response) => response.text()))
  const useExpanded = docObj.template === 'Expanded' && (await fetch(`${domain}/expanded${cl}.txt`).then((response) => response.text()))
  const useAdvanced = docObj.template == 'Advanced' && docObj.latexText

  const instructions = docObj.tailorText || ''
  const templateContent = useCompressed || useExpanded || useAdvanced
  const applicantText = docObj.text
  const resumeText = type != 'coverletter' ? false : resObj.text
  const jobDescription = post?.text
  const bio = defaultBio || ''

  // Set up system and user messages for ChatGPT
  // Set up system and user messages for ChatGPT
  let system_message = {
    role: 'system',
    content: `
      You convert <ApplicantText> into YAML ${type}s using a Pandoc <LatexTemplate> to help inform you of the YAML structure.
      <ProcessingInstructions>
        The YAML must be valid and structured so that it may be used in a Pandoc YAML metadata block within an otherwise empty markdown (.md) file which will then be used to populate the <LatexTemplate>.
        1. The YAML must start and end with "---".
        2. It should be indented and formatted for direct use by Pandoc as metadata.
        3. Only return valid YAML frontmatter — no additional text or markdown. 
  
        Your output will be inserted into a markdown file and used in the following Pandoc command for PDF generation:
        cmd = ['pandoc', md_filename, '--template', <LatexTemplate>]
  
        Strictly return valid YAML format that Pandoc can process.
      </ProcessingInstructions>
      You begin once the user gives you their <FinalInstructions>.
      `,
  }

  let user_messageOne = {
    role: 'user',
    content: `Here is my ${type}: <ApplicantText>${applicantText}</ApplicantText>`,
  }

  let assistant_messageOne = {
    role: 'assistant',
    content: `Thank you for providing the ${type} applicant text.`,
  }

  // Send to ChatGPT for YAML generation
  let prompt = [system_message, user_messageOne, assistant_messageOne]

  if (!!resumeText) {
    let assistant_messageResume = {
      role: 'assistant',
      content: `Please provide the resume text.`,
    }
    let user_messageResume = {
      role: 'user',
      content: `<ResumeContent>${resumeText}</ResumeContent>`,
    }

    prompt.push(assistant_messageResume, user_messageResume)
  }

  let assistant_messageTwo = {
    role: 'assistant',
    content: `Please provide the job description.`,
  }

  let user_messageTwo = {
    role: 'user',
    content: `<JobDescription>${''}</JobDescription>`,
  }

  let assistant_messageThree = {
    role: 'assistant',
    content: `Got it. Now, please provide the applicant's bio.`,
  }

  let user_messageThree = {
    role: 'user',
    content: `<ApplicantsBio>${bio}</ApplicantsBio>`,
  }

  let assistant_messageFour = {
    role: 'assistant',
    content: `Thank you! Finally, please provide the Pandoc template.`,
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
        - Use the job applicants <ResumeText> as a reference, customizing it for the <JobDescription>.
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

  const message = await callChatGPT(prompt, 'gpt-4o-mini', 4096, false, true, user_id, oaikey)
  if (!message) {
    return {
      status: 'error',
      message: 'Error Calling ChatGPT',
      data: {
        type: 'noGptKey',
        error: 'This action requires ChatGPT. No credits or keys found. Please Login to buy credits.',
      },
    }
  }
  console.log('refine_yaml:END', { message })

  let yamlHeader = message.trim()

  //  resumeText, instructions, templateContent, applicantTex, bio, postDescription: post.text,
  // console.log('SHARED: GENERATE RESUME WITH:', { templateContent });
  // let isBrowserContext = typeof window !== 'undefined';
  // if (isBrowserContext) {
  //   console.log('Running in a browser context');
  //   console.log({
  //     type,
  //     resumeText,
  //     resObj
  //   })
  // }

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

  // console.log('Generated YAML:', yamlHeader);
  console.groupEnd()

  return {
    status: 'success',
    data: {
      type,
      company_id: companyid,
      post_id: postid,
      yamlContent: yamlHeader,
    },
  }
}
console.log('gpt all shared.js:refine_yaml', )

// This protects node.js modules from breaking when loading this
const isContentScript = typeof window != 'undefined'
if ( isContentScript) {
    window.refine_yaml = refine_yaml 
}
else{
    console.log('use refine_yaml as a module');
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = { refine_yaml }
    }
}


// this will break content.js scripts as they are not modules
// export { refine_yaml } 
