import React, { useEffect, useState } from 'react';
import { route } from './router.js';
import Settings from './App_Apply_Settings.js';

function ApplicationEditor({
  id, setId,
  userData, postData, setPostData, activeTab, showToast,
  handleGenerateDocument, setUserData, fetchData
}) {
  const [usermessage, setUsermessage] = useState(window.getLS(activeTab + 'Message') || '');
  const [activeId, setActiveId] = useState(window.getLS(activeTab + 'Id') || id);

  // Load initial data or reset when activeTab changes
  useEffect(() => {
    const storedId = window.getLS(activeTab + 'Id');
    const storedMessage = window.getLS(activeTab + 'Message');

    if (storedId && storedMessage) {
      setId(storedId);
      setUsermessage(storedMessage);
    } else if (userData?.[activeTab + 's']?.length > 0) {
      const defaultTemplate = userData[activeTab + 's'][0];
      const defaultId = defaultTemplate.id.toString();
      setId(defaultId);
      setActiveId(defaultId);
      localStorage.setItem(activeTab + 'Id', defaultId);

      try {
        const parsedText = JSON.parse(defaultTemplate.text);
        const newMessage = parsedText.tailorText || '';
        setUsermessage(newMessage);
        localStorage.setItem(activeTab + 'Message', newMessage);
      } catch (error) {
        console.error(`Error parsing default ${activeTab} text:`, error);
      }
    }
  }, [activeTab, setId, userData]);

  // Reset local storage and set new values when dropdown changes
  const handleTemplateChange = (e) => {
    const newSelectedId = e.target.value;

    // Clear local storage for the current activeTab
    localStorage.removeItem(activeTab + 'Id');
    localStorage.removeItem(activeTab + 'Message');

    // Set new ID and message
    setId(newSelectedId);
    setActiveId(newSelectedId);
    localStorage.setItem(activeTab + 'Id', newSelectedId);

    const templates = userData[activeTab + 's'];
    const selectedTemplate = templates.find(t => t.id.toString() === newSelectedId);

    if (selectedTemplate && selectedTemplate.text) {
      const parsedText = JSON.parse(selectedTemplate.text);
      const newMessage = parsedText.tailorText || '';
      setUsermessage(newMessage);
      localStorage.setItem(activeTab + 'Message', newMessage);
    }
  };

  // Update messages when postData changes
  useEffect(() => {
    if (postData) {
      const data = postData?.[activeTab + 'Message'];
      if (data) {
        setUsermessage(data);
        localStorage.setItem(activeTab + 'Message', data);
      }
    }
  }, [postData, activeTab]);

  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setUsermessage(newMessage);
    localStorage.setItem(activeTab + 'Message', newMessage);
  };

  return (
    <>
      <Settings 
        userData={userData} 
        setUserData={setUserData} 
        showToast={showToast} 
        fetchData={fetchData}
        activeTab={activeTab}
        />
    <div className={`${activeTab.toLowerCase()}Template`} style={{ paddingLeft: '8px'}}>
      <select value={activeId} onChange={handleTemplateChange}>
        {userData[activeTab + 's']?.map((template) => (
          <option key={template.id} value={template.id}>{template.title}</option>
        ))}
      </select>
      <br />
      <label htmlFor={`message${activeTab.toLowerCase()}`}>Message to the AI:</label>
      <br />
      <textarea
        name={`message${activeTab.toLowerCase()}`}
        style={{ height: '50px' }}
        placeholder={`Enter a ${activeTab} prompt here`}
        value={usermessage}
        onChange={handleMessageChange}
      />
      <button type='button' name={`generate${activeTab.toLowerCase()}`}
        onClick={() => handleGenerateDocument(usermessage)}
      > Create {activeTab}</button>
    </div>
    </>
  );
}

export default ApplicationEditor;
