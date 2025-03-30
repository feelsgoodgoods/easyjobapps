import React, { useState, useEffect } from 'react';
import { route } from '../../../router.js';

function QATab({ userData, postData }) {
  const [questionInput, setQuestionInput] = useState('');
  const [questionOutput, setQuestionOutput] = useState('');

  useEffect(() => {
    // Load the question input from localStorage if it exists
    const savedQuestionInput = window.getLS("questioninput");
    if (savedQuestionInput) {
      setQuestionInput(savedQuestionInput);
    }
  }, []);

  const handleQuestionInputChange = (e) => {
    const value = e.target.value;
    setQuestionInput(value);
    localStorage.setItem("questioninput", value);
  };

  const askQuestion = async () => {
    if (!questionInput.trim()) return; // Prevent sending an empty question

    console.log("Ask Question", {postData, userData});

    let data = {
      questionInput: questionInput,
      postId: postData?.id || 0,
      bio: userData?.bio?.[0]?.text || 'nobio',
      resume: postData?.resumeText || 'noresume',
      post: postData?.text || 'nopost',
      companyName: postData?.company_name || 'nocompanyname',
      jobTitle: postData?.job_title || 'nojobtitle',
    };

    let resp = await route(data, "/extension_ask_question", "gpt.extension_ask_question");
    setQuestionOutput(resp.questionoutput);
  };

  return (
    <div id="questioncontainer" style={{ padding: '0px 20px' }}> 
      <p><b>Question:</b></p> 
      <textarea
        id="questioninput"
        style={{ height: '50px' }}
        placeholder="Enter a question"
        value={questionInput}
        onChange={handleQuestionInputChange}
      />
      <br />
      <button id="askquestion" onClick={askQuestion}>Ask</button>
      <br />
      <p><b>Answer:</b></p>  
      <textarea
        id="questionoutput"
        style={{ height: '100px' }}
        value={questionOutput}
        readOnly
      />
    </div>
  );
}

export default QATab;
