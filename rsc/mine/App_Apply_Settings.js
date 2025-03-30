import React, { useState, useEffect } from 'react'
import { route, showToast } from './router.js'
import SettingEditor from './App_Apply_SettingEditor.js'

function Settings({ activeTab, userData, setUserData, fetchData }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [editingDocumentId, setEditingDocumentId] = useState(false)
  const [formDataStates, setFormDataStates] = useState(false)

  useEffect(() => {
    console.log('Settings useEffect')
    setIsPopoverOpen(Boolean(window.getLS('popover')))
    setStep(parseInt(window.getLS('step') || '0'))
    setEditingDocumentId(window.getLS('docId') || '')
    let data = window.getLS('formDataStates')
    if (data) {
      console.log('Updating form data states from localStorage')
      setFormDataStates(JSON.parse(data))
    } else {
      let newStates = {
        ...(userData?.resumes?.reduce((acc, resume) => ({ ...acc, ['resume' + resume.id]: JSON.parse(resume.text) }), {}) || {}),
        ...(userData?.coverletters?.reduce((acc, coverletter) => ({ ...acc, ['coverletter' + coverletter.id]: JSON.parse(coverletter.text) }), {}) || {}),
      }
      setFormDataStates(newStates)
    }
    console.log({
      formDataStates,
      currentStep: step,
      isEditing: !!editingDocumentId,
      textLabel: activeTab === 'resume' ? 'Resume' : 'Cover Letter',
    })
  }, [activeTab])

  let defaultForm = {
    uploadMethod: 'file',
    text: '',
    file: null,
    fileContent: '',
    tailor: '0',
    tailorText: '',
    template: 'Expanded',
    latexText: '',
    step: 0,
  }

  const handleUpload = async (e) => {
    const { name, value, files } = e.target
    let formLbl = activeTab + editingDocumentId
    let updatedFormDataStates = { ...formDataStates }
    updatedFormDataStates[formLbl] = { ...(formDataStates[formLbl] || defaultForm), [name]: value }
    if (name === 'file' && files[0]) {
      const fileContent = await getFileContent(files[0])
      const parsedText = await parsePDF(files[0])
      updatedFormDataStates[formLbl] = {
        ...updatedFormDataStates[formLbl],
        file: files[0],
        fileName: files[0].name,
        fileContent: fileContent,
        fileText: parsedText,
      }
    }
    localStorage.setItem('formDataStates', JSON.stringify(updatedFormDataStates))
    setFormDataStates(updatedFormDataStates)
  }

  const getFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => resolve(event.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const parsePDF = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const typedArray = new Uint8Array(event.target.result)
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
        let parsedText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const textItems = textContent.items.map((item) => item.str).join(' ')
          parsedText += textItems + ' '
        }
        resolve(parsedText.trim())
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const handleNext = () => {
    setStep(Math.min(step + 1, 3)), localStorage.setItem('step', step + 1)
  }
  const handleBack = () => {
    setStep(Math.max(step - 1, 0))
    localStorage.setItem('step', step - 1)
  }

  const openPopover = (id) => {
    console.log('openPopover:', { id, type: activeTab }, !!id)
    localStorage.setItem('docId', id)
    setEditingDocumentId(id)
    localStorage.setItem('popover', 'open')
    setIsPopoverOpen(true)
  }

  const closePopover = () => {
    localStorage.setItem('docId', '')
    setEditingDocumentId('')
    localStorage.setItem('popover', '')
    setIsPopoverOpen('')
  }

  const resetForm = () => {
    let formLbl = activeTab + editingDocumentId
    let updatedFormDataStates = { ...formDataStates }
    if (!editingDocumentId) {
      updatedFormDataStates[formLbl] = defaultForm
    } else {
      updatedFormDataStates[formLbl] = JSON.parse(userData[activeTab + 's'].find((upload) => upload.id === editingDocumentId).text)
    }
    setFormDataStates(updatedFormDataStates)
    localStorage.setItem('formDataStates', JSON.stringify(updatedFormDataStates))
  }

  const handleRemove = async (id) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${activeTab}?`)
    if (!confirmDelete) return

    await route({ userinfoid: id }, '/userinfo_remove')
    let key = activeTab + 's'
    let formLbl = activeTab + id
    let updatedFormDataStates = { ...formDataStates }
    delete updatedFormDataStates[formLbl]
    localStorage.setItem('formDataStates', JSON.stringify(updatedFormDataStates))
    setUserData({ ...userData, [key]: userData[key].filter((upload) => upload.id !== id) })
    showToast()
  }

  const handleSave = async () => {
    try {
      const formLbl = activeTab + editingDocumentId;
      const formData = formDataStates[formLbl];
      
      if (!formData) {
        throw new Error('No form data found');
      }
  
      setStep(0);
      
      if (editingDocumentId) {
        await route(
          { userinfoid: editingDocumentId, text: JSON.stringify(formData) },
          '/userinfo_update'
        );
      } else {
        const usingFile = formData?.uploadMethod === 'file';
        const saveThis = {
          label: activeTab.toLowerCase() + 'templates',
          title: (usingFile && formData.fileName) || `Upload ${new Date().toLocaleString()}`,
          text: JSON.stringify(formData)
        };
        
        const newDocument = await route(saveThis, '/userinfo_upload');
        
        if (!newDocument?.id) {
          throw new Error('Failed to create new document');
        }
        
        const newFormLbl = activeTab + newDocument.id;
        const updatedFormDataStates = { 
          ...formDataStates, 
          [newFormLbl]: formData 
        };
        
        setFormDataStates(updatedFormDataStates);
        localStorage.setItem('formDataStates', JSON.stringify(updatedFormDataStates));
      }
  
      await fetchData();
      closePopover();
      showToast();
    } catch (error) {
      console.error('Error saving document:', error);
      // Add appropriate error handling/user notification here
    }
  };

  let formD = formDataStates[activeTab + editingDocumentId] || defaultForm
  let currentData = userData[activeTab + 's'] || []

  return (
    <div id="tabusercontainer">
      <div>
        <div style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{activeTab === 'resume' ? 'Resumes' : 'Cover Letters'}</h2>
              <div>
                <span className="required">
                  <button className="linkbtn" onClick={() => openPopover('')}>
                    Create New
                  </button>
                </span>
              </div>
            </div>
            <div id={`uploaded${activeTab}s`}>
              {currentData.map((item) => (
                <div key={item.id} style={{ marginTop: '4px' }}>
                  <button onClick={() => openPopover(item.id)}>Edit</button>
                  <span>{item.title}</span>
                  <button className="remove" onClick={() => handleRemove(item.id)}>
                    &#x2718;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isPopoverOpen && (
        <SettingEditor
          currentStep={step}
          handleBack={handleBack}
          handleNext={handleNext}
          formData={formD}
          reset={resetForm}
          handleUpload={handleUpload}
          closePopover={closePopover}
          handleSave={handleSave}
          isEditing={!!editingDocumentId}
          textLabel={activeTab === 'resume' ? 'Resume' : 'Cover Letter'}
        />
      )}
    </div>
  )
}

export default Settings
