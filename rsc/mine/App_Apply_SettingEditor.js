import React from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import {r_endpoint} from '../shared/endpoints.js';

// 
let isChromeExt = window.origin.startsWith('chrome-extension');
pdfjsLib.GlobalWorkerOptions.workerSrc = `${isChromeExt?'/dist':''}/pdf.worker.mjs`; 
// 'https://unpkg.com/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs
// 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.8.335/pdf.worker.min.js'
// https://easyjobapps.com/pdf.worker.mjs

const SettingEditor = ({ 
  currentStep, formData, isEditing, documentType, reset, textLabel,
  handleBack, handleNext, handleUpload, closePopover, handleSave
  }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={closePopover}>
    <div style={{ position: 'relative', backgroundColor: 'white', border: '1px solid #ccc', padding: '20px', zIndex: 1000, maxWidth: '90%', maxHeight: '76%', overflowY: 'auto', padding: '0em .8em 1em .8em' }} onClick={(e) => e.stopPropagation()}>
      <h2>
        <span id="editorHeader">{isEditing ? `Edit` : `New`} {textLabel}</span>
        <button id="closedocumenteditor" type="button" onClick={closePopover}>X</button>
      </h2>
      <div style={{display:'flex', justifyContent: 'flex-end'}}>
        <div></div>
        <button type="button" className="linkbtn" style={{ marginRight: '8px' }} onClick={() => reset()}>
          Reset
        </button>
      </div>
      <form style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{display:'inline-block', marginBottom: '.8rem'}}>
          <small className="bottom" data-title ={
            currentStep === 0 ? `Upload a .PDF or enter a ${textLabel.toLowerCase()} as text.`  :
            currentStep === 1 ? `Send a message to the AI which will tailor your ${textLabel.toLowerCase()}.` :
              `Pick an AST friendly template for your new ${textLabel.toLowerCase()}.`
           }> 
            ⓘ
          </small>
          <small style={{paddingLeft:'4px'}}>Part <span id='editorstep'>{currentStep + 1}</span> of 3 </small>
        </div>

        <div id="editoruploadcontainer" style={{ marginBottom: '1rem', display: currentStep === 0 ? 'block' : 'none' }}>
          <div style={{ marginBottom: '.8rem', display: 'inline-flex', justifyContent: 'center' }}>
            <label htmlFor="uploadMethod"><b>Upload Method</b>:</label>
            &nbsp;
            <select id="uploadMethod" name="uploadMethod" value={formData.uploadMethod} onChange={handleUpload}>
              <option value="file">Select File</option>
              <option value="paste">Paste Text</option>
            </select>
            &nbsp; 
          </div>

          {formData.uploadMethod === 'paste' ? (
            <div id="editoruploadtextcontainer" style={{ display: 'block' }}>
              <textarea id="upload-text" name="text" style={{ height: '3rem' }} placeholder="Paste text here." value={formData.text} onChange={handleUpload}></textarea>
            </div>
          ) : (
            <div id="editoruploadfilecontainer" style={{ display: 'block' }}>
              <label htmlFor="thefile">
                <input type="file" id="thefile" name="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />
                <div className="dragDropBox">
                  {formData.fileName || `Drag & drop ${textLabel.toLowerCase()} file here`}
                </div>
              </label>
            </div>
          )}
        </div>

        <div id="editortailorcontainer" style={{ marginBottom: '1rem', display: currentStep === 1 ? 'block' : 'none' }}>
          <div style={{ marginBottom: '0rem', display: 'block' }}>
            { (
              <div id="tailormessage">
                <label htmlFor="tailor-text" style={{ display: 'block' }}><b>Message to AI</b>:</label>
                <textarea id="tailor-text" name="tailorText" style={{ marginTop: '.5rem', height: '4rem' }} placeholder={
                  textLabel == 'Resume' ? `"Please, ensure my executive summary speaks to the job requirements."` : 
                                          `"Please, ensure my relevant skills for the job are highlighted."`
                } value={formData.tailorText} onChange={handleUpload}></textarea>
              </div>
            )}
          </div>
        </div>

        <div id="editortemplatecontainer" style={{ marginBottom: '1rem', display: currentStep === 2 ? 'block' : 'none' }}>
          <span><b>Select Template</b>: </span>
          <select id="template-bool" name="template" value={formData.template} onChange={handleUpload} style={{marginBottom: '0.5rem'}}> 
            <option value="Expanded">Expanded</option>
            <option value="Compressed">Compressed</option>
            <option value="Advanced">Advanced</option>
          </select> 

          {formData.template !== 'none' && (
            <>
              <div className="templateimg" style={{ display: formData.template === 'Expanded' ? 'block' : 'none' }}>
                <br />
                <img src={`${r_endpoint()}/template_${documentType}_compressed_full.png`} alt="Expanded" />
                <span>
                  Expanded
                  <a href={`${r_endpoint()}/template_${documentType}_compressed_full.png`} target="_blank" rel="noopener noreferrer">
                    <svg fill="#000000" width="14px" height="14px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3,4V20a1,1,0,0,0,1,1H20a1,1,0,0,0,1-1V4a1,1,0,0,0-1-1H4A1,1,0,0,0,3,4ZM5,5H19V19H10V15a1,1,0,0,0-1-1H5Zm6.293,7.707a1,1,0,0,1,0-1.414L14.086,8.5H13a1,1,0,0,1,0-2h3.5a1.01,1.01,0,0,1,.382.077A1,1,0,0,1,17.5,7.5V11a1,1,0,0,1-2,0V9.914l-2.793,2.793A1,1,0,0,1,11.293,12.707Z"></path>
                    </svg>
                  </a>
                </span>
              </div>

              <div className="templateimg" style={{ display: formData.template === 'Compressed' ? 'block' : 'none' }}>
                <br />
                <img src={`${r_endpoint()}/template_${documentType}_expanded_full.png`} alt="Compressed" />
                <span>
                  Compressed
                  <a href={`${r_endpoint()}/template_${documentType}_expanded_full.png`} target="_blank" rel="noopener noreferrer">
                    <svg fill="#000000" width="14px" height="14px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3,4V20a1,1,0,0,0,1,1H20a1,1,0,0,0,1-1V4a1,1,0,0,0-1-1H4A1,1,0,0,0,3,4ZM5,5H19V19H10V15a1,1,0,0,0-1-1H5Zm6.293,7.707a1,1,0,0,1,0-1.414L14.086,8.5H13a1,1,0,0,1,0-2h3.5a1.01,1.01,0,0,1,.382.077A1,1,0,0,1,17.5,7.5V11a1,1,0,0,1-2,0V9.914l-2.793,2.793A1,1,0,0,1,11.293,12.707Z"></path>
                    </svg>
                  </a>
                </span>
              </div>

              {formData.template === 'Advanced' && (
                <div id="latex-textbox">  
                  <textarea id="latex-text" name="latexText" placeholder={`Describe how your desired pdf should look, or paste a Latex template here.`} style={{ height: '4rem', marginTop: '1rem' }} value={formData.latexText} onChange={handleUpload}></textarea>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button id="back" type="button" style={{ display: currentStep === 0 ? 'none' : 'block' }} onClick={handleBack}>Back</button>
          <span> </span>
          <button 
            id={currentStep === 2 ? "" : "next"}
            className={currentStep === 2 ? "styldbtn" : ""} 
            type="button"  
            onClick={currentStep === 2 ? handleSave : handleNext}>
            {currentStep === 2 ? "Save" : "Next"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default SettingEditor;
