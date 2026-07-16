import React, { useState, useEffect } from 'react';
import { Popover } from '../App_Popover.js';
import { route } from '../../../router.js';
    // 
    // 
    // ai_restyle => (UserMessage + Latex => Regenerate Latex) then (LATEX => Generate PDF)
    // ai_retext => ( UserMessage + newText => Regenerate NewText) then (NewText => Generate Latex) then (LATEX => Generate PDF)
    // UserText => (NewText => Generate Latex) then (LATEX => Generate PDF)
    // UserManual:: (LATEX => Generate PDF)
    // 
    // 
const UpdateDocumentPopover = ({ onClose, activeTab, postData, setPostData, generatePdf, showToast, resumeId, coverletterId, userData }) => {
  const [editMode, setEditMode] = useState('text');
  const [localDocument, setLocalDocument] = useState(postData[activeTab] || '');
  const [localMessage, setLocalMessage] = useState('');
  const [localText, setLocalText] = useState(postData[activeTab + 'Text'] || '');

  useEffect(() => {
    const storedMessage = window.getLS(`updatePopover${activeTab}Message`);
    setLocalMessage(storedMessage || '');
     
    setLocalDocument(postData[activeTab] || '');
  }, [activeTab, postData]);

  const handleEditModeChange = (e) => {
    setEditMode(e.target.value);
  };

  const handleDocumentChange = (e) => {
    setLocalDocument(e.target.value);
  };

  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setLocalMessage(newMessage);
    localStorage.setItem(`updatePopover${activeTab}Message`, newMessage);
  };

  const handleTextChange = (e) => {
    setLocalText(e.target.value);
  };

  const handleSaveUpdate = async (updateType) => {
    console.group(`handleSaveUpdate ${activeTab}`);
    
    if (updateType == 'user_manual'){
      // Do nothing send directly to generate pdf  w body.latex 
      let base64EncodedData = await generatePdf(localDocument);
      let obj = {
        ...postData, 
        [activeTab]: localDocument, // resume: latex
        ...(base64EncodedData ? { [activeTab + '64']: base64EncodedData } : {}),
      } 
      setPostData(prevPostData => obj);
  
      showToast();
      onClose();
   
      console.groupEnd();
      return
    }

    let endpoint = '/edit';
    const body = {
      type: activeTab,
      companyid: postData.company_id || '',
      postid: postData.id || '',
      resumeid: resumeId,
      coverletterid: coverletterId, 
      oldLatex: postData[activeTab] || '',
      oldText: postData[activeTab + 'Text'] || '',
      updateType: updateType,
      message: localMessage,

    }; 
    body[`new${activeTab}`] = localDocument;
    body[`new${activeTab}Text`] = localText;
 
    let startTime = new Date().getTime();
    console.log('sending', { body });
    let resp = await route(body, endpoint);
    let closeout = (msg) => { console.error(msg); console.groupEnd(); }
    let endTime = new Date().getTime();
    let lapseInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Operation took ${lapseInSeconds} seconds`);
    if (!resp) return closeout('No response from handleSaveUpdate'); 

    let finalText = {}

    // GRAB UPDATE TEXT DIRECTLY 
    if (updateType === 'user_text'){ finalText[activeTab+'Text'] = localText }
    
    // GRAB UPDATE TEXT FROM CHATGPT > SECOND CALL TO GET LATEX.
    if(updateType === 'ai_retext'){ 
      finalText[activeTab+'Text'] = resp[activeTab+'Text']
      updateType = body.updateType = 'user_text'
      startTime = new Date().getTime();
      body.message = 'No special instructions.'
      console.log('sending second', { body });
      resp = await route(body, endpoint);
      endTime = new Date().getTime();
      lapseInSeconds = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`ai_retext: Operation took ${lapseInSeconds} seconds`);
      if (!resp) return closeout('No response from handleSaveUpdate');  
    } 
    
    const newDoc = resp[`new${activeTab}`]; 
    console.log('FINISHIFASDF JASODFIJA GOTBACK', {updateType}, newDoc )
    if(updateType === 'ai_retext'){ } // Grab from Callback
    let base64EncodedData = await generatePdf(newDoc);
    let obj = {
      ...postData,
      ...finalText,      // resumeText: latex
      [activeTab]: newDoc, // resume: latex
      ...(base64EncodedData ? { [activeTab + '64']: base64EncodedData } : {}),
    } 
    setPostData(prevPostData => obj);

    showToast();
    onClose();
 
    console.groupEnd();
  };

  return (
    <Popover id={`viewedit${activeTab.toLowerCase()}container`} title={`Edit ${activeTab}`} onClose={onClose}>
      <div>
        <select value={editMode} onChange={handleEditModeChange}>
          <option value="text">Update Text</option>
          <option value="ai_retext">AI Edit (Text)</option>
          <option value="ai_restyle">AI Edit (Style)</option>
          <option value="manual">Manual Edit</option> 
        </select>
      </div>

      {editMode === 'text' && (
        <>
          <p>Manually update the raw Latex Code used to create your resume.</p>
          <textarea
            id={`${activeTab}Text`}
            style={{ height: '100px', width: '100%' }}
            placeholder={`Edit text`}
            value={localText}
            onChange={handleTextChange}
          />
          <button onClick={() => handleSaveUpdate('user_text')}>Save Changes</button>
        </>
      )}

      {editMode === 'ai_retext' && (
        <>
          <p>Give instructions for the AI to update your text.</p>
          <textarea
            id={`${activeTab}AiMessage`}
            style={{ height: '100px', width: '100%' }}
            placeholder={`Enter a message for the AI`}
            value={localMessage}
            onChange={handleMessageChange}
          />
          <button onClick={() => handleSaveUpdate('ai_retext')}>Apply Changes</button> 
        </>
      )}

      {editMode === 'ai_restyle' && (
        <>
          <p>Give instructions for the AI to update the style and formatting of your document.</p>
          <textarea
            id={`${activeTab}AiStyleMessage`}
            style={{ height: '100px', width: '100%' }}
            placeholder={`Enter a message for the AI`}
            value={localMessage}
            onChange={handleMessageChange}
          />
          <button onClick={() => handleSaveUpdate('ai_restyle')}>Apply Changes</button> 
        </>
      )}

      {editMode === 'manual' && (
        <>
          <p>Update the text used in your resume.</p>
          <textarea
            id={`${activeTab}Update`}
            style={{ height: '300px', width: '100%' }}
            value={localDocument}
            onChange={handleDocumentChange}
          />
          <button onClick={() => handleSaveUpdate('user_manual')}>Save Manual Changes</button> 
        </>
      )} 
    </Popover>
  );
};

export default UpdateDocumentPopover;
