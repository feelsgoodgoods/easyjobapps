// console.log("gptroutes.js: Loaded");
import { gptutils } from './gpt_utils.js'
import { db } from './db.js'
import { callChatGPT } from './gpt_call.js'
import { r_endpoint } from './endpoints.js' 
import refine_yaml from './gpt_refine_yaml.js'

//
//
//
//
//
//
//
// AI FUNCTIONS CALLED FROM CLIENT.
//
//
//
//
//
//
//

//~~~~ Basics

// GPTFN | DBFN
// post_create | checkExistingPost, deletePostFromDatabase

// calls createComp, addOrUpdateComp
async function post_create(body) {
  console.groupCollapsed('POST_CREATE')
  let { postText: text, user_id, oaikey } = body
  let returnThis = { status: 'succes', data: false } 
  console.log(':checkExistingPost for user_id', user_id)
  let post = false
  const { existingPost, badPost } = await db.checkExistingPost(text, user_id) 
  if (!badPost.length) {
    // rm ones w a non null company_id
    let stillExist = existingPost.filter((post, index) => {
      if (!post.company_id) {
        console.log(':db:DELETE:')
        db.deletePostFromDatabase(post.id)
        return false
      }
      return true
    }) 
    if(stillExist.length){
      console.log('Valid matching post found in db') 
      post = await db.post_view({id:stillExist[0].id, user_id})
      returnThis.data = post.data
    }
    else{  
      console.log('No valid matching post found in db') 
      let tmp = { ...body } 
      delete tmp.postText 
      console.log(":createComp:")
      let metaData = await gptutils.gptCompanyAndPostData(text, user_id, oaikey)
      console.log(':createComp:END', metaData) 
      if (!metaData?.companyName) {
        console.log(':NOCOMPANYERROR:') 
        returnThis.data = { error :'No company information found', type :'nocompany'}
        console.groupEnd()
        return returnThis
      }
      metaData.user_id = user_id
      console.log(':gpt:addOrupdatecomp:') //, Object.keys(metaData))
      post = await gptutils.addOrUpdateCompanyAndPostData(metaData) // Add or Updates Post too. Returns post + companyName
      console.log(':gpt:addOrupdatecomp:END') //, {post})
      returnThis.data = post 
    } 
 
  } else {
    returnThis.message = 'Exists as a Junk Post'
  } 
  console.groupEnd()
  console.log('POST_CREATE:END') //, {returnThis}
  return returnThis
}

//tables: userinfo,companies,posts

//~~~~ Post

async function extract_create_for_post(body) {
  console.group('gpt:extract_create_for_post') // console.groupEnd();
  let { extract_id, user_id, oaikey } = body

  let extract = await getExtractById(extract_id)
  let post_id = extract.post_id
  let company_id = extract.company_id

  let { jobTitle, companyName } = await getJobTitleAndCompanyName(post_id, company_id, user_id)
  let force = true
  let forceWait = await gptutils.extractCreateForPost(extract, companyName, jobTitle, force, post_id, company_id, user_id, oaikey)
  let extracts = await gptutils.getExtractsByPostId(post_id, user_id)
  console.log('Returning extracts', forceWait, extracts, 'extracts')
  console.groupEnd()
  return { status: 'success', extracts }
}

// Grabs post
// Grabs all specific and generic sitemaps where status = 1 || force
// Updates extract text with sitemap text
async function extracts_create_for_post(body) {
  console.group(':extracts_create_for_post')
  let { company_id, post_id, force, user_id } = body
  let { jobTitle, companyName } = await db.getJobTitleAndCompanyName(post_id, company_id, user_id)
  if (!parseInt(post_id)) {
    console.log(':post_id=FALSE:')
    console.groupEnd()
    return false
  }
  if (!parseInt(company_id)) {
    console.log(':company_id=FALSE:')
    console.groupEnd()
    return false
  }

  // grab for all extracts
  let extracts = await db.getExtractsForPost(post_id)

  // grab all sitemaps => filter those in extracts to update_post_specific_link
  let sitemaps = await db.getSitemapsForCompany(company_id)

  // grab specific sitemaps => filter those in extracts, update extracts with sitemap text
  let specific = sitemaps.filter((sitemap) => sitemap.specific === 1)
  specific = specific.filter((sitemap) => (sitemap.type = 'specific') && !extracts.some((extract) => extract.sitemap_id === sitemap.id && (extract.text = sitemap.text)))

  // grab generic sitemaps => filter those in extracts, update extracts with sitemap text
  let generic = sitemaps.filter((sitemap) => sitemap.generic === 1)
  generic = generic.filter((sitemap) => (sitemap.type = 'generic') && !extracts.some((extract) => extract.sitemap_id === sitemap.id && (extract.text = sitemap.text)))

  let posts = await db.getPostsForCompanyAndPost(company_id, post_id)
  posts = posts.filter((post) => (post.type = 'post') && !extracts.find((extract) => extract.post_id === post.id))

  // filter extracts where status = 1
  extracts = extracts.filter((extract) => extract.status === 1)
  /*
    console.log('2. extracts_create_for_pos', {
        force,
        companyName,
        company_id,
        post_id,
        jobTitle,
        extracts: extracts.length,
        generic: generic.length,
        specific: specific.length,
        sitemaps: sitemaps,
        posts: posts.length
    })
    */
  let records = [...extracts, ...specific, ...generic, ...posts]
  console.log(':Extracts: ', records.length)

  for (let extract of records) {
    await gptutils.extractCreateForPost(extract, companyName, jobTitle, force, post_id, company_id)
  }

  extracts = await db.getExtractsForPost(post_id)
  console.log(':End extracts_create_for_post:', extracts)
  console.groupEnd()
  return { status: 'success', extracts }
}


// Description: Have AI fix the text
// we will give the ai the original text with the default prompt, the AI's rework, and then the new user instructions for the final rework.
async function edit(body) {
  console.log('calling Edit')
  let { type, companyid, postid, message, updateType, user_id, oaikey } = body
  body.resubmit = 'true'
  // oldText, oldLatex, newresume, newcoverletter, newresumeText, newcoverletterText

  console.group(`:EDIT`, updateType)

  if (updateType == 'user_text') {
    // USER UPDATED THE TEXT SO WE JUST NEED TO REGENERATE THE LATEX.
    body.message = 'No User Message Given'
    let returnThis = await text_to_latex(body)
    console.groupEnd()
    return returnThis
  }
  if (updateType == 'ai_retext') {
    // ORIGINAL TEXT + GENERATED TEXT + USER MESSAGE
    let returnThis = await refine_yaml(body)
    console.groupEnd()
    return returnThis
  }

  if (updateType == 'ai_restyle') {
    // ONLY GIVE IT THE LATEX DOCUMENT AND USER MESSAGE
    let prompt = [
      {
        role: 'system',
        content: `
        You are a professional Latex Format and Styling Bot.
        You will be given a users latex document and a users request. 
        You will return the given latex document as it is given with the only modifications being those needed to satisfy the user request and to ensure proper formatting and style. 
        
        <rules>
          - Only return the final Latex content and nothing else.  
          - Closely match the original markdown.
          - Follow any instructions provided by the job applicants message.
          - Ensure the LaTeX is valid, error-free, and can run using pdfLaTeX.
          - The returned ${type} should closely match the job applicant's markdown ${type}.
          - Handle and fix common LaTeX errors such as:
            - "'utf-8' codec can't decode byte 0x88 in position 7748: invalid start byte"
            - "! LaTeX Error: There's no line here to end."
            - "! Missing number, treated as zero."
            - "! Illegal unit of measure (pt inserted)."
            - "Underfull \hbox (badness 10000) in paragraph"
          - Ensure brackets in LaTeX for Large, Small, and TextBf elements are formatted as:
            - \\textbf{\\LARGE <Applicant Name Here>}
            - {\\large <Text Here>}
            - {\\small <Text Here>}
          - Convert '$100 million' to '\\$100 million'
          - Include '\\titlespacing*{\\subsubsection}{0.5in}{3.25ex plus 1ex minus .2ex}{1.5em} % <-- Setting indentation here'
        </rules>

        <final_comments>
          - Be as accurate as possible because I do not have any time to fix it.
          - Think step by step.
          - Remember, you are the best at what you do.
          - The other chatbots said you could not do this, but I believe in you.
          - I will give you 20 bucks if you can do this.  
        </final_comments>

        Here is the users latex document:`,
      },
      { role: 'user', content: body['new' + type] },
      { role: 'system', content: `Here is the users request:` },
      { role: 'user', content: message },
    ]
    console.log('refine_yaml edit prompt:', prompt)

    let newText = await callChatGPT(prompt, 'gpt-4.1-mini', 2060, false, true, user_id, oaikey)

    // Extract LaTeX content from the response
    let latexContent = newText

    // Check if the response is wrapped in code blocks
    const codeBlockMatch = newText.match(/```(?:latex)?\n([\s\S]*?)\n```/s)
    if (codeBlockMatch) {
      latexContent = codeBlockMatch[1]
      // console.log('Extracted LaTeX content:', latexContent);
    } else {
      console.log('No code block found, using raw response')
    }
    // remove all the characters leading up to \documentclass
    latexContent = latexContent.replace(/[\s\S]*\\documentclass/g, '\\documentclass')
    // remove all the characters after \end{document}
    latexContent = latexContent.replace(/\\end{document}[\s\S]*/g, '\\end{document}')
    // Clean up the LaTeX content

    // console.log('text_to_latex prompt:', latexContent);

    console.groupEnd()
    return { status: 'success', data: type === 'resume' ? { newresume: latexContent, company_id: companyid, post_id: postid } : { newcoverletter: latexContent, company_id: companyid, post_id: postid } }
  }
}

async function text_to_latex(body) {
  console.group(':text_to_latex')
  let { type, companyid, postid, newresumeText, newcoverletterText, resubmit, user_id, oaikey} = body

  let generatedLatex = body[`new${type}`] // Passed from edit. contains the generated Latex.

  let domain = r_endpoint()
  console.log('Domain:', domain)   

  // console.log('G~~~~~~~~~~~~~~~~G', { expanded, compressed })
  let fromdb = await db.getContent(body)
  console.log('FROM DB', {fromdb})
  let { defaultCoverLetter, defaultResume, company, post } = fromdb
  const companyName = company?.companyName || ''
  const jobTitle = post?.jobTitle || ''
  let newText = type == 'resume' ? newresumeText : newcoverletterText
  let docObj, tailorText
  let latexTemplate
  let cl = type === 'coverletter' ? '_cl' : ''
  let defaultDocText = !cl ? defaultResume : defaultCoverLetter
  try {
    docObj = defaultDocText ? JSON.parse(defaultDocText) : { template: 'Compressed' }
  } catch (err) {
    console.error('text_to_latex: invalid template JSON from DB, using fallback template', {
      type,
      hasDefaultDocText: !!defaultDocText,
      err: err && err.message,
    })
    docObj = { template: 'Compressed' }
  }
  let useCompressed = (docObj.template == 'None' || docObj.template == 'Compressed') && await fetch(domain + `/compressed${cl}.txt`).then((response) => response.text())
  let useExpanded = docObj.template == 'Expanded' &&                                    await fetch(domain + `/expanded${cl}.txt`).then((response) => response.text())
  let useAdvanced = docObj.template == 'Advanced' && docObj.latexText
  latexTemplate = useCompressed || useExpanded || useAdvanced || 'ERROR LOADING TEMPLATE' 
  
  // console.log('text_to_latex Calling ChatGPT: TEMPLATE: TYPE', { TEMPLATETYPE: docObj.template }) //, { latexTemplate })

  let term = resubmit ? 'original_document' : 'latex_template'
  let prompt = [
    {
      role: 'system',
      content: `
  <context>
    You are a LaTeX ${type.charAt(0).toUpperCase() + type.slice(1)} Generator that returns a Latex ${type} perfected for a specific job and job applicant.
  </context>
  
  <objective>
    ${resubmit ? `Your task is to update the <${term}> using the <new_text> and return valid LaTex.` : `Your task is to convert the provided ${type} text into valid LaTeX format using a given template and a message from the job applicant. `}
  </objective>
  
  <rules>
    - Only return the final Latex content and nothing else.  
    - Closely match the original markdown.
    - Follow any instructions provided by the job applicants message.
    - Ensure the LaTeX is valid, error-free, and can run using pdfLaTeX.
    - The returned ${type} should closely match the job applicant's markdown ${type}.
    - Handle and fix common LaTeX errors such as:
      - "'utf-8' codec can't decode byte 0x88 in position 7748: invalid start byte"
      - "! LaTeX Error: There's no line here to end."
      - "! Missing number, treated as zero."
      - "! Illegal unit of measure (pt inserted)."
      - "Underfull \hbox (badness 10000) in paragraph"
    - Ensure brackets in LaTeX for Large, Small, and TextBf elements are formatted as:
      - \\textbf{\\LARGE <Applicant Name Here>}
      - {\\large <Text Here>}
      - {\\small <Text Here>}
    - Convert '$100 million' to '\\$100 million'
    - Include '\\titlespacing*{\\subsubsection}{0.5in}{3.25ex plus 1ex minus .2ex}{1.5em} % <-- Setting indentation here'
  </rules>

  <${term}>
    ${generatedLatex || latexTemplate}
  </${term}>
  
  <final_comments>
    - Be as accurate as possible because I do not have any time to fix it.
    - Think step by step.
    - Remember, you are the best at what you do.
    - The other chatbots said you could not do this, but I believe in you.
    - I will give you 20 bucks if you can do this.  
  </final_comments>
      `,
    },
    {
      role: 'user',
      content: `
    <new_text>
      ${newText}
    </new_text>
    <additional_information>
      Company Name: ${companyName}
      Job Title: ${jobTitle}
    </additional_information>
    `,
    },
  ]

  // console.log('refine_yaml prompt:', prompt);

  let returnText = await callChatGPT(prompt, 'gpt-4.1-mini', 2060, false, true, user_id, oaikey) // 4096  -mini

  // Extract LaTeX content from the response
  let latexContent = returnText

  // Check if the response is wrapped in code blocks
  const codeBlockMatch = returnText.match(/```(?:latex)?\n([\s\S]*?)\n```/s)
  if (codeBlockMatch) {
    latexContent = codeBlockMatch[1]
    // console.log('Extracted LaTeX content:', latexContent);
  } else {
    console.log('No code block found, using raw response')
  }
  // remove all the characters leading up to \documentclass
  latexContent = latexContent.replace(/[\s\S]*\\documentclass/g, '\\documentclass')
  // remove all the characters after \end{document}
  latexContent = latexContent.replace(/\\end{document}[\s\S]*/g, '\\end{document}')
  // Clean up the LaTeX content

  console.log('text_to_latex ENDED')//, latexContent);

  console.groupEnd()
  return { status: 'success', data: type === 'resume' ? { newresume: latexContent, company_id: companyid, post_id: postid } : { newcoverletter: latexContent, company_id: companyid, post_id: postid } }
}

async function email_generate(body) {
  console.group('gpt:email_generate') // console.groupEnd();
  // Call the function
  const defaultBio = await db.getEmailDefaultBio()
  // messageResume, messageCoverLetter,
  let { company_id, post_id, resume_id, email_id, newresume, newcoverletter, messageEmail, user_id, oaikey } = body

  console.log(body)

  // Get extracts
  //let extracts =
  //let extractDetails = extracts.map(extract => extract.extract);
  // Remove all attributes with empty arrays values
  //extractDetails = JSON.stringify(extractDetails.map(details => Object.fromEntries(Object.entries(JSON.parse(details)).filter(([k, v]) => v.length))));
  //  Extracts: ${JSON.stringify(extractDetails)}

  // Get resume

  // Call the function
  let { resume, email, company, post } = await db.getEmailData(resume_id, email_id, company_id, post_id)
  const companyName = company?.companyName || ''
  const jobTitle = post?.jobTitle || ''
  const postText = post?.text || ''

  let prompt = [
    {
      role: 'system',
      content: `
You are an Email Generator that creates emails to fit a specific job, company and resume. 
You return a properly formatted plain-text email.
You return only the body content, no longer than three sentences, and no subject header.
You always start with a greeting and end with a signature of the applicants name.
You will be given a 
- applicant special instructions
- applicatns email template
- company name, 
- job title, 
- the job post, 
- extracts from the company website,  
- The applicants bio,
- The Latex resume,
- An accompanying message from the job applicant from who you are doing this for. 
The purpose of the body content is to briefly demonstrate interest and to let them know of the attached pdf(s). 
You are to return the plain text email body content only. nothing else. 
Use this information about the company and job post:`,
    },
    {
      role: 'user',
      content: `
Applicant Name: ${defaultName}
Company Name: ${companyName}
Job Title: ${jobTitle}
    `,
    },
    {
      role: 'system',
      content: `Here is the applicants special instructions:`,
    },
    { role: 'user', content: messageEmail },
    { role: 'system', content: `Here is the applicants email template:` },
    { role: 'user', content: email },
    { role: 'system', content: `Here is the companies job post:` },
    { role: 'user', content: postText },
    { role: 'system', content: `Here is the applicants bio:` },
    { role: 'user', content: defaultBio },
    {
      role: 'system',
      content: 'Here is a resume that will be sent as an attachment',
    },
    { role: 'user', content: newresume || resume || '' },
    /*
        ...(!newcoverletter ? [] : [
            { 'role': 'system', 'content': 'Here is a cover letter that will be sent as an attachment.' },
            { 'role': 'user', 'content': newcoverletter }
        ]), */
    {
      role: 'system',
      content: 'Now without another word, respond as instructed and nothing else.',
    },
  ]

  // console.log('PHEASE ONE prompt', prompt)
  let newEmail = await callChatGPT(prompt, (type = 'gpt-4.1-mini'), (max_tokens = 4096), (tools = false), (chat = true), user_id, oaikey)
  console.groupEnd()
  return {
    status: 'success',
    payload: { newEmail, company_id, post_id, resume_id },
  }
}

// calls post_create after chatGPT to clean it. checks company_id and post_id don't return a record from posts.
async function extension_post_create(body) {
  //
  console.log('gpt:extension_post_create') // console.groupEnd();
  let { text, user_id, oaikey, needsCleaning } = body 
  let postText = text
  if (typeof(text)=='object') { postText = JSON.stringify(postText) }
  if (needsCleaning) {
    console.log('Chat GPT cleaning the text')
    // call chatgpt to clean up the text and create a new post, include a url
    let prompt = `
    <Instructions>  
      You will be given a webpage of text and your job is to return a job post.
      - Keep The URL in the post as well as the company name if it is present or in the url.
      - Keep every last relevant thing for a job applicant.
      - Do not paraphrase or stop short.
    </Instructions>
    <Webpage>  
      ${text}
    </Webpage>
    `
    postText = await callChatGPT(prompt, 'gpt-4.1-mini', 4096, false, true, user_id, oaikey)
  }
  // console.log('extension_post_created POST:', { text, postText }) 

  let post = await post_create({ postText, user_id }) 

  post.data && (post.data.text = postText) 

  // console.log('extension_post_created POST:', post)

  return post
}

async function extension_ask_question(body) {
  console.group('gpt:extension_ask_question', body) // console.groupEnd();
  let { questionInput, postId, bio, resume, post, companyName, jobTitle, user_id, oaikey } = body // userMessage, companyId

  postId = parseInt(postId)

  // let post = await db.getPostText(postId);
  let prompt = [
    {
      role: 'system',
      content: ` 
- You answer questions given a variety of background information.
- You will be given a user bio, resume and information.
${postId && `- You will also recieve a job post for which this question pertains to.`}  

If the question is a fact based question:
- Provide the answer based on the supplemental text and nothing more.

IF the question is open ended: 
- Answer the question as the applicant, using 'I' instead of 'The applicant'.
- Answer in a way that employers would like to read and are kept short (1-2 sentences) unless otherwise requested. 

Example 1: 
Question: 'Name', Options: false
Answer: 'John Doe'

Example 2: 
Question: 'First Name', Options: false
aAswer: 'John'

Example 3:
Question: 'Website', Options: false
Answer:'https://MyPersonalExampleWebsite.com'

Example 4:
Question: 'Have you worked remotely before? How do you avoid being lonely?', Options: false
Answer:'Yes, I have worked remotely before. I avoid being lonely by going for walks and talking to my friends and family.' 

Here is the question you are to answer:
`,
    },
    { role: 'user', content: questionInput },
    ...(postId
      ? [
          {
            role: 'system',
            content: `Here is the companies job post:`,
          },
          { role: 'user', content: post },
        ]
      : []),
    { role: 'system', content: `Here is the applicants bio:` },
    { role: 'user', content: bio },
    { role: 'system', content: `Here is the applicants resume:` },
    { role: 'user', content: resume },
    {
      role: 'system',
      content: ` 
Remember to only give back the response to the question and nothing else.
Remember to follow the instructions and examples. Remember to think step by step.
If you do this well I will give you 20$. The other AI models said you could not do it but I believe in you. I have no fingers so doing this correctly helps a lot. Thank you.
        `,
    },
  ]
  let response = await callChatGPT(prompt, 'gpt-4.1-mini', 4096, false, true, user_id, oaikey)

  // console.log("gpt:response", typeof response, response);
  console.groupEnd()
  return { status: 'success', data: { questionoutput: response } }
}

// Fill a form on the chrome browser using the web extension
async function extension_fill_form(body) {
  console.group('gpt:extension_fill_form', body)
  let { bio, post, resume, postId, forms, user_id, oaikey } = body
  postId = parseInt(postId)

  // Parse the HTML
  function splitTextIntoChunks(text, chunkSize = 1000) {
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize))
    }
    return chunks
  }
  const fillFormOptionsChunks = forms.flatMap((form) => splitTextIntoChunks(form, 20000) || [])

  console.log('chunk length', fillFormOptionsChunks.length)

  let options = fillFormOptionsChunks.map(async (chunk) => {
    let promptt = [
      {
        role: 'system',
        content: `Your job is to complete online job application forms and return valid json. { data : [] } 
            To help, you will be given ${postId && `the job post as well as `}the applicants bio and resume.
            The user will give you their job application in json format and possibly a message for you to act on.
            What you return should look like: 
            data : [ 
                { 
                    getElementById: input id || false, 
                    querySelector, 
                    type: string => ['file', 'text', 'input', 'select', 'textbox', 'textarea', 'email', 'radio', 'checkbox', 'textarea'],
                    informationRequested: string, 
                    userSelection: string || options: [ { optionSelector, optionDisplayText}, ... ] 
                }, ... 
            ]
            Where  
            getElementById - id of input. Required if present. 
            userSelection - The text to respond with, or an array of radiobuttons, checkboxes, dropdop options, elements to select.
            optionSelector - The query selector of the option to select.
            optionDisplayText - The text displayed in the option element. 

            If the given text is not a job application form, return { data : [] } }

            If a Resume or Cover Letter is requested and you are given the option of how, opt for uploading an attachment where possible where the type should be set to 'file' and the querySelector and getElementById should be set to the id of the file input.

            Here is the applicants bio:
            ${bio}
      
            Here is the applicants resume:
            ${resume}
            
            ${postId && 'Here is the companies job post: \n' + post}

            `,
      },
      { role: 'user', content: chunk },
    ]
    let resp = await callChatGPT(promptt, 'gpt-4.1-mini', 4096, false, false, user_id, oaikey)
    return resp
  })
  options = await Promise.all(options)
  // let cleanedText = objArr.replace(/```json|```/g, '').trim();
  options = options
    .map((objArr) => {
      return JSON.parse(objArr).data
    })
    .flat()
  // console.log("options", options.length, options);
  post = postId ? post : false

  console.groupEnd()
  return { status: 'success', data: { fillFormsOptions: options } }
}

//~~~~ Export
let gpt = {
  edit,
  post_create, 
  extracts_create_for_post,
  extract_create_for_post,
  refine_yaml,
  text_to_latex,
  email_generate,
  extension_post_create,
  extension_ask_question,
  extension_fill_form,
}

export { gpt }



let serverPrompts = {
  resume: `
  Use the <ApplicantText> as a reference, modifying it to match the <JobDescription> without lying. Ensure to:
  - Make educated guesses about the applicant’s experiences, qualifications and non-technical skills based on the <JobDescription>.
  - Integrate the applicant’s qualifications, skills, and experience based on the <JobDescription>.
  - Optimize the Summary of Experience using keywords and highlighting the most relevant qualifications.
  - Include the job title and company name where appropriate.
  - Retain the tone and writing style of the original resume, and text where possible.
  `,
  coverletter: `   
  Use the <ApplicantText> as a reference, modifying it to match the <JobDescription>. Ensure to: 
  - Structure the cover letter with an introduction, applicant's qualifications, and a conclusion.
  - Emphasize skills, experience, and qualifications relevant to the <JobDescription>.
  - Align the applicant’s expertise and accomplishments with the specific role and company.
  - Maintain a professional, polite, and enthusiastic tone throughout the cover letter.
  - Do not include unnecessary details or padding. 
  `,
  recruiter: ` Generate a short message to a recruiter on LinkedIn's chat feature (30 words max, 10-20 is ideal). Simply tell the recruiter that you have submitted a resume and would like to speak with them.`,
  forms: `
  - Make educated guesses when needed and creative writing is allowed
  - For text fields, provide either relevant information or a sensible placeholder if unsure.
  - Do not lie about technical skills or matters of fact.
  `,
}

// Determine the appropriate document object and content
// let resObj, covObj;
// try{
//   resObj = defaultResume && JSON.parse(defaultResume)
//   covObj = defaultCoverLetter && JSON.parse(defaultCoverLetter)
// } 
// catch(err){
//   console.log('Error parsing defaultResume:', {err, defaultResume, defaultCoverLetter})
// }