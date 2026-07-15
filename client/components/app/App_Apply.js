import React, { useState, useEffect } from 'react'
import UploadPostComponent from './apply/App_Apply_Upload_Post.js' // Sets postData state and LS (postdata, postText)
import { route } from '../../router.js'
import UpdateDocumentPopover from './apply/App_Apply_Edit.js'
import QATab from './apply/App_Apply_Tab_QA.js'
import SettingsTab from './apply/App_Apply_Tab_Settings.js'
import { r_endpoint, p_endpoint } from '../../../shared/endpoints.js'
import ApplyEditor from './apply/App_Apply_Create.js'
import { Popover } from './App_Popover.js'

let end = (msg = 'groupend') => {
  console.log(msg) 
  console.groupEnd()
}

// ls[ resume PdfBase64, _editLatex, updatePopover, postText 

function Apply({ showToast, postData, setPostData, userData, setUserData }) { 
  const [activeTab, setActiveTab] = useState('resume')
  const [activePopover, setActivePopover] = useState(null)
  const [resumePdfUrl, setResumePdfUrl] = useState(null)
  const [coverletterPdfUrl, setCoverletterPdfUrl] = useState(null)  
  

  // Create the state:pdfUrl's using ls:PdfContent.
  const processPdfContent = (contentKey, callback) => {
    const savedContent = postData[contentKey]
    // console.log('processPdfContent', contentKey, { savedContent, postData })
    if (savedContent) {
      const byteCharacters = atob(savedContent.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)

      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      callback(url)
    }
  }  

  useEffect(() => {
    processPdfContent('resume64', setResumePdfUrl)
    processPdfContent('coverletter64', setCoverletterPdfUrl)
    // window.handleExtensionGeneratedDocument = handleExtensionGeneratedDocument // type, blob, postDatass
  }, [postData]) 

  // Clears all but ls.postText
  const handleClearPost = () => {
    setPostData('{}')
    setResumePdfUrl('')
    setCoverletterPdfUrl('')
    setActivePopover(null)  

    // Reset EDIT popup content
    localStorage.removeItem('resume_editLatex')
    localStorage.removeItem('coverletter_editLatex')
    localStorage.removeItem('updatePopoverresumeMessage')
    localStorage.removeItem('updatePopovercoverletterMessage')
  }

  // onMessage from content.js
  // const handleExtensionGeneratedDocument = async (obj) => {
  //   console.log('handleExtensionGeneratedDc', obj); // postData: resp,  type (res/cl), base64EncodedData
  //   let { type, base64EncodedData, postData: newPostData } = obj;   
  //   console.log('TYPEOF newPostData', typeof(newPostData)); 
  //   setPostData(newPostData); 
  // }; 

  const getEditorIds = () => {
    let resumeId = userData?.editorData?.resume.id
    let coverletterId = userData?.editorData?.coverletter?.id
    return { resumeId, coverletterId }
  }

  // sets postData.resumeText and state.'newResumeText'
  const handleGenerateDocument = async () => {
    console.group('handleGenerateDocument')

    let startTime = new Date().getTime()
    let { resumeId, coverletterId } = getEditorIds() 

    const body = {
      type: activeTab,
      resumeid: resumeId,
      coverletterid: coverletterId,
      companyid: postData.company_id,
      postid: postData.id,
      editorData: userData.editorData,
    }  
    const resp_text = await route(body, `/refine_yaml`)
    const text = resp_text?.['yamlContent'] 
    if (!text) {  
      if(resp_text?.type == "noGptKey") window.alert('Please check your credits')
      console.log(`No ${activeTab} content received`, { resp_text }); return 
  } 

    // Log time
    let endTime = new Date().getTime()
    let lapseInSeconds = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`Operation took ${lapseInSeconds} seconds`, Object.keys(resp_text)) 
  
    // Generate PDF using Pandoc-templates
    let base64EncodedData = await generatePdf(text) 
    
    // Set postData.resumeText/coverletterText with new generated text. 
    const newPostData = { 
      ...postData, 
      [activeTab + 'Text']: text, 
      [activeTab + '64']: base64EncodedData
    } 

    // todo: If a postid is given, then update the id in the db with the new text.
    setPostData(newPostData) 
    end('END:handleGenerateDocument')
  }

  // Sets resumePdfBase64 or coverletterPdfBase64
  const generatePdf = async (latexContent) => {
    console.group('generatePdf', { latexContent })
    const response = await generate_pdf({ latex: latexContent })
    if (response instanceof Blob) {
      const reader = new FileReader()
      reader.readAsDataURL(response)
      return new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result)
      })
    } else {
      console.error('Error: Expected Blob, but received:', {response, latexContent})
      return null
    }
  }
  
  
  async function generate_pdf(body) {
    let { id, latex, newresume, newcoverletter, type } = body
    let text = latex || newresume || newcoverletter
    if (!text) {
      console.log('GeneratePDF Failed - no text newresume newcoverletter given')
      console.groupEnd()
      return false
    }
    const url = p_endpoint()
    const domain = r_endpoint() 
    const editor = userData.editorData[activeTab] 
    // Template retrieval logic 
    const cl = activeTab == 'coverletter' ? '_cl' : '' 
    const template = editor.template;

    const fetchTemplateText = async (name) => {
      const response = await fetch(`${domain}/${name}${cl}.txt`)
      if (!response.ok) {
        throw new Error(`Template fetch failed (${response.status}) for ${name}${cl}.txt`)
      }
      return response.text()
    }

    try {
      const useCompressed = (template == 'None' || template == 'Compressed') && (await fetchTemplateText('compressed'))
      const useExpanded = template == 'Expanded' && (await fetchTemplateText('expanded'))
      const useDouble = template == 'Double' && (await fetchTemplateText('double'))
      const useAdvanced = template == 'Advanced' && editor.latexText
      const templateContent = useCompressed || useExpanded || useDouble || useAdvanced
      console.log('Generate pd2', { domain, text, templateContent })

      if (!templateContent) {
        throw new Error(`No template content found for template=${template}`)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text, // The YAML text generated by GPT
          latex: templateContent, // The LaTeX template
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Retrieve the Blob (PDF content)
      const blob = await response.blob()

      console.log('PDF generated successfully', blob)
      console.groupEnd()

      // Return the Blob directly instead of the URL
      return blob
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate document. Please check server connection and try again.')
      console.groupEnd()
      return false
    }
  }

  let isRes = activeTab === 'resume'
  let isCover = activeTab === 'coverletter' 

  let postIsValid = postData && (typeof postData === 'object' ? Object.keys(postData) : postData).length > 0
  let isQa = activeTab === 'qa'
  let isSettings = activeTab === 'settings'
  
  return (
    <div> 
      <div> 
        <UploadPostComponent 
          showToast={showToast}  
          userData={userData} 
          postData={postData} setPostData={setPostData} 
          handleClearPost={handleClearPost}  
        />
      </div>
      <h3 id="alertsetup"></h3>

      {/* {process?.env?.WEBPACK_ENV == 'development' && (
        <button onClick={() => chrome.runtime.reload()}> Reset Apfp (Dev Only) </button> 
            )} */}

      <div>
        <input type="radio" name="posttab" id="reviewresume" checked={activeTab === 'resume'} onChange={() => setActiveTab('resume')} />
        <label className="tab-label" htmlFor="reviewresume">
          Resume
        </label>
        <input type="radio" name="posttab" id="reviewcoverletter" checked={activeTab === 'coverletter'} onChange={() => setActiveTab('coverletter')} />
        <label className="tab-label" htmlFor="reviewcoverletter">
          Cover Letter
        </label>
        <input type="radio" name="posttab" id="reviewqa" checked={activeTab === 'qa'} onChange={() => setActiveTab('qa')} />
        <label className="tab-label" htmlFor="reviewqa">
          Q/A
        </label>
        <input type="radio" name="posttab" id="reviewsettings" checked={activeTab === 'settings'} onChange={() => setActiveTab('settings')} />
        <label className="tab-label" htmlFor="reviewsettings">
          Settings
        </label>
      </div>

      {!isQa && !isSettings && <ApplyEditor  
        userData={userData} setUserData={setUserData}   
        activeTab={activeTab} showToast={showToast} 
        handleGenerateDocument={handleGenerateDocument} />
      }

      {postIsValid && ((isRes && resumePdfUrl) || (isCover && coverletterPdfUrl)) ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', margin: '0 10px' }}>
            <button onClick={() => window.open(isRes ? resumePdfUrl : coverletterPdfUrl, '_blank')}> View in New Tab </button>
            <button type="button" onClick={() => setActivePopover(isRes ? 'resume' : 'coverletter')}>
              Edit {isRes ? 'Resume' : 'Cover Letter'}
            </button>
          </div>
          <iframe id="pdfViewer" style={{ width: '100%',  height: '700px', marginTop: '20px' }} src={isRes ? resumePdfUrl : coverletterPdfUrl}></iframe>
        </div>
      ) : null}

      {activeTab === 'qa' && <QATab postData={postData} userData={userData} />}

      {activeTab === 'settings' && <SettingsTab userData={userData} setUserData={setUserData} />}

      {activePopover && <UpdateDocumentPopover 
        userData={userData} 
        resumeId={userData?.editorData?.resume?.id}
        coverletterId={userData?.editorData?.coverletter?.id}
        postData={postData} setPostData={setPostData} 
        activeTab={activePopover} 
        showToast={showToast} 
        handleGenerateDocument={handleGenerateDocument} 
        generatePdf={generatePdf} 
        onClose={() => setActivePopover(null)} />}
    </div>
  )
}

export default Apply

/*
          <h2 style={{paddingLeft:'8px'}}>Usage</h2>
          <ol id="spaceol" >  
            <li>Complete the setup</li>
            <li>Click 'Load Job' while viewing a job description.</li> 
            <div style={{margin: '4px 0rem 4px -1rem', background: 'lightyellow', maxWidth:'500px' }}> 
              <p style={{margin:'0px', padding:'8px'}}>
                💡 Easy Job Apps will tailor your resume and coverletter. You can make edits as needed, manually or with AI.
              </p>
            </div>
            <li>Click 'Apply' while viewing the job application form. </li> 
          </ol>
*/

    // activeTab == 'resume' ? 
    //   setCoverletterFormDataState({...overletterFormDataState, text}) : 
    //   setResumeFormDataState({...resumeFormDataState, text}) 

    // let { resumeId, coverletterId } = getEditorIds()
    // let matchId = activeTab === 'resume' ? resumeId : coverletterId
    // let record = userData[activeTab + 's']?.find((t) => t.id.toString() === matchId)  

/*
    // let data = response
    // if (data?.forms) {
    //   data.bio = userData.bio?.[0]?.text || '';  
    //   data.post = JSON.stringify(postData);
    //   // data.resume = restext;
    //   data.postId = postData?.id;
      
    //   let resp = await route(data, `/extension_fill_form`);
    //   console.log("fillFormsOptions:", resp);
    //   let fillFormsOptions = resp.fillFormsOptions;

    //   fillFormsOptions.map(optionData => {
    //     let { type, informationRequested } = optionData;
    //     if (type === "file" || type === "hidden") {
    //       console.log('FILE UPLOAD', { optionData });
          
    //       if (informationRequested.toLowerCase().includes("resume")) { 
    //         const resumeContent = window.getLS('resumePdfBase64');
    //         console.log('- - RESUME UPLOAD', { resumeContent });
    //         if (resumeContent) {
    //           optionData.file = resumeContent;
    //           optionData.fileName = "resume.pdf";
    //         }
    //       }
          
    //       if (informationRequested.toLowerCase().includes("cover")) { 
    //         const coverContent = window.getLS('coverletterPdfBase64');
    //         console.log('- - Coverletter UPLOAD', { coverContent });
    //         if (coverContent) {
    //           optionData.file = coverContent;
    //           optionData.fileName = "coverletter.pdf";
    //         }
    //       }
    //     }
    //   });
      
    //   console.log('chrome.runtime.onmessage:fillFormsOptions:', { fillFormsOptions });
    //   sendMessage("fillForms", JSON.stringify(fillFormsOptions));
    // }
*/
