import React, { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'   
import { r_endpoint } from '../../../../shared/endpoints.js'

let isChromeExt = window.origin.startsWith('chrome-extension')
pdfjsLib.GlobalWorkerOptions.workerSrc = `${isChromeExt ? '/dist' : ''}/pdf.worker.mjs`

let capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
function ApplyEditor({ userData, setUserData, activeTab, showToast, handleGenerateDocument  }) {

  let defaultResumeText = `Use the job applicants ResumeText as a reference, customizing it for the JobDescription without lying. Ensure to:
    - Do not confuse the job description as a part of the resume.
    - Make educated guesses about the applicant’s experiences, qualifications and non-technical skills based on the JobDescription.
    - Integrate the applicant’s qualifications, skills, and experience based on the JobDescription.
    - Optimize the Summary of Experience using keywords and highlighting the most relevant qualifications.
    - Include the job title and company name where appropriate.
    - Retain the tone and writing style of the original resume, and text where possible.
    `;
  let defaultCoverletterText = `Use the CoverLetterText as a reference, if given, customizing it for the JobDescription. Ensure to: 
    - Structure the cover letter with an introduction, applicant's qualifications, and a conclusion.
    - Emphasize skills, experience, and qualifications relevant to the JobDescription.
    - Align the applicant’s expertise and accomplishments with the specific role and company.
    - Maintain a professional, polite, and enthusiastic tone throughout the cover letter.
    - Do not include unnecessary details or padding. 
    `
  const newForm = { id: 'new', file: '', title : '', text: '', tailorText: activeTab == 'resume' ? defaultResumeText:defaultCoverletterText, template: 'Expanded', latexText: '' }

  const fileInputRef = useRef(null)  
  const selectedEditorData = userData?.editorData?.[activeTab]
  const [formData, setFormData] = useState(selectedEditorData || newForm)
  const [isEdited, setIsEdited] = useState(false);  
  
  useEffect(() => { 
    setFormData(selectedEditorData || newForm)
    setIsEdited(false);
  }, [activeTab, selectedEditorData])


  useEffect(() => { 
    // console.log(`Editor: New ${activeTab} FormData:`, formData)
    const newUserData = {
      ...userData,
      editorData : {
        ...userData.editorData, 
        [activeTab]: formData,
    } }
    setUserData(newUserData)  
  }, [formData])


  // Retrieve the selected document data or create a newForm
  const handleSelectDocument = (e) => {
    const docName = e.target.value
    console.log('handleSelectDocument id:',docName) 
    if (fileInputRef.current) { fileInputRef.current.value = '' } 
    if (docName == 'new') { 
      console.log('New Form Selected'); 
      setFormData(newForm);  
    }else{ 
      let documents = userData?.[activeTab + 's'] || [] 
      let selectedDoc = documents.find((doc) => doc.title == docName)  
      let parsedDoc = JSON.parse(selectedDoc.text)
      // if (Object.keys(parsedDoc).length == 0) { parsedDoc = newForm }
      parsedDoc.title = docName
      parsedDoc.id = selectedDoc.id 
      setFormData(parsedDoc)
      setIsEdited(false);
    }
  }

  const handleReset = () => { 
    console.log('resetForm')
    // get current id. if = 'new' then set to newForm else grab from docs
    let documents = userData?.[activeTab + 's'] || []  
    let selectedDoc = documents.find((doc) => doc.id === formData.id) 
    console.log('handleReset: selectedDoc:', selectedDoc)
    let docsFormData = JSON.parse(selectedDoc?.text || '{}') 
    console.log('handleReset: docsFormData:', docsFormData)
    if (Object.keys(docsFormData).length == 0) { docsFormData = newForm }
    setFormData(docsFormData)
    setIsEdited(false); // Reset edited flag when form is reset
  }

  const parsePDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const typedArray = new Uint8Array(arrayBuffer)
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
      let parsedText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const textItems = textContent.items.map((item) => item.str).join(' ')
        parsedText += textItems + ' '
      }
      return parsedText.trim()
    } catch (error) {
      console.error('Error parsing PDF:', error)
      showToast('Error parsing PDF file')
      return ''
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type === 'application/pdf') {
      const parsedText = await parsePDF(file)
      
      // Extract filename without extension to use as title if needed
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      
      setFormData((prev) => ({ 
        ...prev,
        file: file,
        text: parsedText,
        // Set title to filename if current title is empty
        title: prev.title?.trim() ? prev.title : fileName
      })) 

    } else {
      showToast('Please upload a PDF file')
    } 
  }

  const handleInputChange = (e) => { 
    const { name, value } = e.target 
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    })) 
    setIsEdited(true); // Mark as edited when input changes
  }

  // Updates not just the editorData but also the user.resumes
  const handleSave = async () => {
    console.group('handleSave')
    try {
      if (!formData.text?.trim()) {
        showToast('Please provide content for your document')
        return
      }

      if (!formData.tailorText?.trim()) {
        showToast('Please provide instructions for the AI')
        return
      } 
      // Create or Update the userinfo record 
      let newFormData = formData 
      let record
      if (formData.id === 'new') {
        const saveThis = {
          label: activeTab.toLowerCase() + 'templates',
          title: formData.title || `Upload ${new Date().toLocaleString()}`,
          text: JSON.stringify(formData),
        }
        record = await route(saveThis, '/userinfo_upload') 
        console.log('New Record:', record)
        newFormData = { ...formData, id: record.id } 
        record.text = JSON.stringify(newFormData)
      }
      else{
        let currentRecord = userData[activeTab + 's'].find((doc) => doc.id === newFormData.id)
        record = { ...currentRecord, text: JSON.stringify(newFormData) }
      }

      const updateThis = { userinfoid: record.id, text: JSON.stringify(newFormData) }
      await route(updateThis,'/userinfo_update') // returns exactly what you give it.  
      let newUserData = {
        ...userData,
        [activeTab + 's']: [
          ...(userData[activeTab + 's'] || []).filter((doc) => doc.id !== newFormData.id),
          record,
        ]
      } 

      console.log('New UserData:', newUserData)

      setUserData(newUserData);
      setFormData(newFormData)
      setIsEdited(false); // Reset edited flag when form is saved
      showToast('Document saved successfully')
    } catch (error) {
      console.error('Error saving document:', error)
      showToast('Failed to save document. Please try again.')
    } finally {
      console.groupEnd()
    }
  }

  const handleRemove = async (id) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${activeTab}?`)
    if (!confirmDelete) return
    await route({ userinfoid: id }, '/userinfo_remove')
    const newUserData = {
      ...userData,
      [activeTab + 's']: userData[activeTab + 's'].filter((doc) => doc.id !== id),
    }
    setUserData(newUserData)

    if (formData.id === id) {
      setFormData(newForm) 
    }

    showToast('Document deleted successfully') 
  } 

  let documents = userData?.[activeTab + 's'] || []  

  const viewDocumentSelector = (
    <>
      <select value={formData.id} onChange={handleSelectDocument} style={{ flex: 1, padding: '8px', marginRight: '10px' }}> 
      {[...documents]
        .sort((a, b) => {
          if (a.id === formData.id) return -1; // Move current selection to top
          if (b.id === formData.id) return 1;  // Keep the current selection at top
          return a.title.localeCompare(b.title); // Alphabetical sort for the rest
        })
        .map((doc) => (
          <option key={doc.id} value={doc.title}>
            {doc.title}
          </option>
        ))
      }
      <option value="new">Create New {activeTab}</option>
    </select>
    {formData.id != "new" && (
      <button className="remove" style={{ padding: '8px' }} onClick={() => handleRemove(formData.id)}>
        &#x2718;
      </button>
    )}
    </>
  )
  const viewTitle = (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', width:'100%' }}>
      <label style={{ marginRight: '10px' }}><b>Title</b>:</label>
      <input
        type="text"
        name="title"
        value={formData.title}
        onChange={handleInputChange}
        placeholder={`Give this ${activeTab.toLowerCase()} a name`}
        style={{
          flex: 1,
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          width: 'inherit'
        }}
      />
    </div>
  );
  
  const saveButton = (
    <button
    id='save'
      onClick={handleSave}
      // disabled={!formData.id || !formData.title}
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer', //formData.id && formData.title ? 'pointer' : 'not-allowed',
        // opacity: formData.id && formData.title ? 1 : 0.6,
      }}
    >
      Save
    </button>
  )

  const resetButton = ( 
    <a
      onClick={handleReset}  
      className='linkbtn'
      style={{ 
      }}
    >
      Reset
    </a>
  )

  const saveResetPanel = (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
      {isEdited && resetButton || <span></span>} 
      {saveButton}
    </div>
  )

  const viewText = formData.id != 'new' ? (
    <div id={activeTab + 'Text'}>
      <details>
        <summary style={{ cursor: 'pointer', paddingLeft: '0px' }}><b>{capitalize(activeTab)}</b></summary>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexGrow: 1 }}>
            {/* Text area or other content here */}
          </div>
          <span
            onClick={() => fileInputRef.current.click()}
            style={{
              color: 'blue',
              textDecoration: 'underline',
              cursor: 'pointer',
              float: 'right', // This will float the button to the right
            }}
          >
            Upload File
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        <p>Uploaded files will overwrite the text below.</p>
        <textarea
          name="text"
          value={formData.text}
          onChange={handleInputChange}
          placeholder="Paste text here"
          style={{
            width: '90%',
            maxHeight: '24rem',
            minHeight: '2rem',
            height: '12rem',
            padding: '8px 20px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        /> 
      </details>
    </div>
  ) : (
    <div id={activeTab + 'Text'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <b>{capitalize(activeTab)}</b>
        <span
          onClick={() => fileInputRef.current.click()}
          style={{
            color: 'blue',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Upload File
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
  
      <p> </p>
  
      <textarea
        name="text"
        value={formData.text}
        onChange={handleInputChange}
        placeholder="Paste text here"
        style={{
          width: '90%',
          maxHeight: '24rem',
          minHeight: '2rem',
          height: '12rem',
          padding: '8px 20px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          maxWidth: '100%',
        }}
      /> 
    </div>
  );
  
  const viewAiInstructions = (
    <div id={activeTab + 'Instructions'} style={{ display: formData.id === 'new' ? 'none' : 'block' }}>
      <details>
        <summary style={{ cursor: 'pointer', paddingLeft: '0px' }}>
          <b>Tailoring Instructions</b>
        </summary>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexGrow: 1 }}>
            {/* Text area or other content here */}
          </div>
        </div>
        <p>PDFs are created by AI follow these instructions. tweek them as needed.</p>
        <textarea
          name="tailorText"
          value={formData.tailorText}
          onChange={handleInputChange}
          placeholder={
            activeTab === 'Resume'
              ? 'Please ensure my executive summary speaks to the job requirements.'
              : 'Please ensure my relevant skills for the job are highlighted.'
          }
          style={{
            width: '90%',
            maxHeight: '24rem',
            minHeight: '2rem',
            height: '2rem',
            padding: '8px 20px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        /> 
      </details>
    </div>
  );

  const viewTemplate = (
    <div id={activeTab + 'Template'} style={{ display: formData.id === 'new' ? 'none' : 'block' }}>
      <details>
        <summary style={{ cursor: 'pointer', paddingLeft: '0px' }}>
          <b>Template</b>
        </summary>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexGrow: 1 }}>
            {/* Text area or other content here */}
          </div>
        </div>
        <p>
          Select a template to use for the PDF.
        </p>
        <select
          name="template"
          value={formData.template}
          onChange={handleInputChange}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        >
          <option value="Expanded">Expanded</option>
          <option value="Compressed">Compressed</option>
          <option value="Double">Two Column</option>
          <option value="Advanced">Advanced</option>
        </select>
        {formData.template === 'Advanced' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              <b>LaTeX Template</b>:
            </label>
            <textarea
              name="latexText"
              value={formData.latexText}
              onChange={handleInputChange}
              placeholder="Enter a custom LaTeX template here..."
              style={{
                width: '100%',
                height: '150px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />  
          </div>
        )}
        
        { /* 
          if not =='Advanced' then create an img tag that has a src of /rsc/template_DRODPOWNVALUE_ 
          template_coverletter_compressed_full.png
          template_type_DROPDOWNVALUE.png
        */ 
        }
        { formData.template != 'Advanced' && ( 
          <img  
            src={`${r_endpoint()}/template_${activeTab.toLowerCase()}_${formData.template.toLowerCase()}.png`} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          /> 
        )}
      </details>
    </div>
  );

  const createPdfButton = ( 
  <>
    {isEdited && <p style={{ margin: '0px', display: 'inline' }}><small>Unsaved changes will be used</small></p> || <span></span>}
    <button
      type="button"
      name={`generate${activeTab.toLowerCase()}`}
      onClick={() => handleGenerateDocument()}
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: formData.id && formData.title ? 'pointer' : 'not-allowed',
        opacity: formData.id && formData.title ? 1 : 0.6,
      }}
    >
      Create PDF
    </button>
  </> 
  )
  

  return (
    <div id={activeTab+'Editor'}style={{ padding: '20px' }}>
      { /* Document Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
        {viewDocumentSelector}
      </div>   
      <p style={{ background : '#f8f9fa', padding: '10px', borderRadius: '5px'}}>
        { 
          formData.id =='new' ? 
            'Upload an original resume to get started.' : 
            <>
              Have AI create a new PDF using your {activeTab}, instructions, and if given, {activeTab!='resume' && ', resume,'} bio and a loaded job description.
            </>

        }
      </p>
      { /* Form Name */}
      {formData.id =='new' && (
        <div style={{ marginBottom: '20px' }}>
          {viewTitle}
        </div>
      )}
      { /* Upload Text */}
      <div style={{ marginBottom: '20px' }}>
        {viewText}
      </div>
      { /* Template */}
      <div style={{ marginBottom: '20px' }}>
        {viewTemplate}
      </div>
      { /* Instructions */}
      <div style={{ marginBottom: '20px' }}>
        {viewAiInstructions}
      </div> 
      { /* Save */}
      <div style={{ marginBottom: '20px'}}>
        {formData.id !== 'new' && saveResetPanel}
      </div>
      { /* Create resume/ submit */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}> 
        { formData.id != 'new' && createPdfButton}
        { formData.id =='new' && saveButton}
      </div> 

      <hr />
    </div>
  )
}

export default ApplyEditor