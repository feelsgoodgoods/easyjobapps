const handleGenerateDocument = async (message) => { 
    let startTime = new Date().getTime();
    console.group('handleGenerateDocument', {postData})
    const body = {
      type: activeTab,
      companyid: postData.company_id,
      postid: postData.id,
      resumeid: resumeId,
      coverletterid: coverletterId,
      message: message
    };
    
    const resp_text = await route(body, `/refine_text`); 
    if (!resp_text) { end('ERROR:handleGenerateDocument1'); return; }
    
    // Update state, localstorage: [newresumeText, newcoverletterText]
    let isResume = activeTab == 'resume'
    let setText = isResume ? setNewcoverletterText : setNewresumeText
    let label = 'new'+activeTab+'Text'
    let text = resp_text[label] 
    setText( text )
    localStorage.setItem(label, text)
    body[label] = text; 
    
    const resp = await route(body, `/text_to_latex`);
    if (!resp) { end('ERROR:handleGenerateDocument2'); return; }

    let obj = { ...postData, [activeTab+'Text']: text }  
    
    // Log time
    let endTime = new Date().getTime();
    let lapseInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Operation took ${lapseInSeconds} seconds`, Object.keys(resp));

    const latexContent = resp['new'+activeTab];
    console.log('Generated latex content:', {latexContent});

    if (!latexContent) { console.log(`No ${activeTab} content received from generate_latex`, { resp }); return;  }

    await generatePdf(latexContent);

    obj = { ...obj, [activeTab]: latexContent }
    setPostData(obj);
    localStorage.setItem('postdata', JSON.stringify(obj));

    end('END:handleGenerateDocument');
  };

  async function generate_pdf(body) {
    let { id, latex, newresume, newcoverletter, type } = body;
    let url = "https://s.charleskarpati.com/compile";
    let text = latex || newresume || newcoverletter;

    console.group('Generate PDF', { postBodySentKey: Object.keys(body), url });

    if (!text) {
        console.log('GeneratePDF Failed - no text newresume newcoverletter given');
        console.groupEnd();
        return false;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latex: text })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Retrieve the Blob (PDF content)
        const blob = await response.blob();

        console.log('PDF generated successfully', blob);
        console.groupEnd();

        // Return the Blob directly instead of the URL
        return blob;

    } catch (error) {
        console.error('Error generating PDF:', error);
        console.groupEnd();
        return false;
    }
  }
  const generatePdf = async (latexContent) => {
    try {
      console.log('Generating PDF for', {latexContent});
      const response = await generate_pdf({ latex: latexContent });
      if (response instanceof Blob) {
        const reader = new FileReader();
        reader.readAsDataURL(response);
        reader.onloadend = function() {
          const base64data = reader.result;
          localStorage.setItem(activeTab + 'PdfContent', base64data);
          const url = URL.createObjectURL(response);
          activeTab === 'resume' ? setResumePdfUrl(url) : setCoverletterPdfUrl(url)
        };
      } else {
        console.error("Error: Expected Blob, but received:", response);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };