import React, { useState, useEffect } from 'react';
import { route } from '../../../router.js';
import { set } from 'lodash';

const Popover = ({ id, title, onClose, children }) => ( 
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex',
    justifyContent: 'center', alignItems: 'center'
  }} onClick={onClose}>
    <div id={id} style={{
      position: 'relative', backgroundColor: 'white', border: '1px solid #ccc',
      padding: '20px', zIndex: 1000, maxWidth: '90%', maxHeight: '76%', overflowY: 'auto'
    }} onClick={(e) => e.stopPropagation()}>
      <h2>
        {title}
        <button type="button" style={{ float: 'right', background: 'gray', color: 'white' }} onClick={onClose}>X</button>
      </h2>
      {children}
    </div>
  </div>
);
        
const ManualPostPopover = React.memo(({ companies, postText, setpostText, onClose, handleSearchCompany, handleLoadPostById, handleManualUploadPost }) => {
  const handleManualLoadTextChange = (e) => {
    console.log('react memo')
    const newPostText = e.target.value;
    setpostText(newPostText);
    localStorage.setItem('postText', newPostText);
  };

  return (
    <Popover id="loadpostcontainer" title="Load Post" onClose={onClose}>
      <div style={{ margin: '15px', background: '#eee' }}>
        <small>
          <b>Either:</b>
          <code>'Search'</code> past uploads by company name or
          <code>'Upload'</code> a job description.
        </small>
      </div>
      <label style={{ display: 'block', marginBottom: '.5rem' }}>Company Name:</label>
      <div style={{ marginBottom: '1rem' }}>
        <input placeholder="Search" id="companyname" onChange={handleSearchCompany} />
      </div>
      {companies?.length > 0 &&
        companies.map((company, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <details>
              <summary>{company.companyName}</summary>
              {company.posts?.map((post, j) => (
                <div key={j}>
                  <button type="button" onClick={() => handleLoadPostById(post?.id)}>Load</button> - {post.jobTitle}
                </div>
              ))}
            </details>
          </div>
        ))}
      <label style={{ display: 'block', marginBottom: '.5rem' }}>Job Post Text:</label>
      <textarea
        id="postText"
        style={{ height: '100px' }}
        placeholder="Enter the post"
        value={postText}
        onChange={handleManualLoadTextChange}
      />
      <button className="styldbtn" onClick={handleManualUploadPost}>
        Upload
      </button>
    </Popover>
  );
});


const EditPostPopover = React.memo(({ initialJobDescription, onClose, onUpdate }) => {
  const [editedJobDescription, setEditedJobDescription] = useState(initialJobDescription);

  const handleJobDescriptionChange = (e) => {
    setEditedJobDescription(e.target.value);
  };
  
  const handleEditUpdatePost = async () => {
    try {
      await onUpdate(editedJobDescription);
      onClose();
    } catch (error) {
      console.error("Error updating post:", error);
    }
  };

  return (
    <Popover id="editpostcontainer" title="Edit Post" onClose={onClose}>
      <div style={{ margin: '15px', background: '#eee' }}>
        <small>
          <b> Make changes to the job post. </b>
        </small>
      </div>
      <label style={{ display: 'block', marginBottom: '.5rem' }}>
        Job Post:
      </label>
      <textarea
        id="postupdate"
        style={{ height: '100px' }}
        placeholder="Update the post"
        value={editedJobDescription}
        onChange={handleJobDescriptionChange}
      />
      <button id="updatepost" onClick={handleEditUpdatePost}>Update</button>
    </Popover>
  );
});

// Sets postData state and localStorage (postdata, postText)

function UploadPostComponent({ 
    showToast, userData, postData, setPostData, handleClearPost
  }) {
  const [jobTitle, setJobTitle] = useState(postData?.jobTitle || '');
  const [companyName, setCompanyName] = useState(postData?.companyName || '');
  const [jobDescription, setJobDescription] = useState(postData?.text || '');                 // View/Edit
  const [postText, setpostText] = useState(localStorage.postText || ''); // MANUAL UPLOAD, VIEW/EDIT
  const [companies, setCompanies] = useState([]);
  const [activePopover, setActivePopover] = useState(null); 

  useEffect(() => {
    window.handleAutoApplyResponse = handleAutoApplyResponse;  
    window.handleAutoLoadJobResponse = handleAutoLoadJobResponse; 
  }, []);
  
  let handleError = (response) => {
    if (response.error) {
      if (response.type == 'extension') {
        alert('Please get the chrome extension to enable this feature.')
      }
      if (response.type == 'refresh') {
        alert('Please refresh the page and try again.')
      } 
      console.log('handleApplyButton ERROR:', response.error);
    }
  }
  useEffect(() => { 
    if (postData) {
      setJobTitle(postData?.jobTitle || '');
      setCompanyName(postData?.companyName || '');
      setJobDescription(postData?.text || '');  
    } else {
      console.log('UPLOAD POST: NO DATA FOUND');
    } 
  }, [postData]); 

  // Content script uses postData to fill forms and generate docs.
  async function handleApplyButton(){ 
    let response = await window.passToContent?.("apply", {postData, userData}); 
    console.log('handleApplyButton', response)
    if (response?.error){handleError(response)}
  } 

  // requests from content or background script. 
  async function handleAutoApplyResponse (fromContent) { 
    console.log('handleAutoLod fromContent?', {fromContent}); // {text, type, postData{ type+64:base64EncodedData} }
    // handleClearPostLocal();
    const type = fromContent.type;
    const text = fromContent.text;
    const base64EncodedData = fromContent.base64EncodedData;
    const newPostData = {
      ...fromContent.postData,
      [type + 'Text']: text, 
      [type + '64']: base64EncodedData
    }; 
    if (text && newPostData) {
 
          console.log('SETTING POST DATA', {newPostData}); 
          setPostData(newPostData); 
          setActivePopover(null);
          showToast();
    }
    else{
      console.log('handleAutoLod ERROR');
    }
  };

  async function handleAutoLoadButton(){
    handleClearPostLocal();
    let response = await window.passToContent?.("getPost", false);
    if (response?.error){
      console.log('handleAutoLoadButton ERROR:', response.error);
    }
  }

  // Used if sidepanel is open and no jwt (not loggedin).
  const handleAutoLoadJobResponse = async (body) => { 
    console.group('Upload EXTENSION Post'); 
    const newPostData = await route(body, "/extension_post_create"); //  text, user_id, oaikey, needsCleaning 
    console.log('handleAutoLoadJobResponse:', {newPostData});
    if (newPostData) { 
      handleClearPostLocal();
      setPostData(newPostData);  
      showToast(); 
      console.groupEnd();
      return newPostData;
    }
    else{
      alert('Unable to load job. Please check your account settings.')
      setActivePopover(null);
      console.groupEnd(); 
    } 
    return newPostData
  }
 


  const handleClearPostLocal = () => { 
    setJobTitle('');
    setCompanyName('');
    setJobDescription('');
    setPostData(false);  
    setActivePopover(null);
    handleClearPost(); 
  };

  const handleManualLoadTextChange = (e) => { 
    console.log('handleManualLoadTextChange!!!!', e.target.value);
    // handleClearPostLocal();
    // setpostText(e.target.value);
    // localStorage.setItem('postText', e.target.value);
  };

  const handleManualUploadPost = async () => {  
    const newPostData = await route({ postText: postText }, "/post_create");
    console.log('handleManualUploadPost:', {postText, newPostData});
    if (newPostData && !newPostData.error) { 
      setPostData(newPostData); 
      setActivePopover(null);
      showToast(); 
    }
    else{
      console.log('handleManualUploadPost ERROR:', newPostData);
      alert('Load Post: ' + (newPostData?.error || 'Unable to load job. Please check your account settings.'))
      setActivePopover(null);
    }
    console.groupEnd();
  }

  const handleUpdatePost = async (updatedJobDescription) => {
    const updatedPostData = await route( { postId: postData.id, postText: updatedJobDescription }, "/post_update" ); 
    setPostData(updatedPostData); 
    showToast();
  }; 
 
  const handleSearchCompany = async (e) => {
    if (!e.target.value) return;
    if (e.target.value.length < 3) return;
    const companyName = e.target.value; 
    const resp = await route({ companyName }, "/search_company");
    if (!resp) return;
    if(resp.error) return alert(resp.error);
    const companies = resp;
    console.log('handleSearchCompany:', {companyName, companies});
    setCompanies(companies);
  }

  const handleLoadPostById = async (postId) => {
    const post = await route({ postId }, "/post_view/"+postId);
    console.log('getPostById:', {postId, post});
    if (post) {
      setPostData(post); 
      setActivePopover(null);
    }
    else{
      alert('Unable to load job. Please check your account settings.')
      setActivePopover(null);
    }
  } 
  

  return (
    <div id="tabpostcontainer">
      <div style={{background:'#eee', color:'#333', padding:'10px 8px 30px 8px'}}>
        <h2>Auto</h2>

        <div id="loadAndApplyContainer">
          <div>
            <button id="autoload" onClick={ () => handleAutoLoadButton() }>Load Job</button>
            <br/>
            <button className="linkbtn" type="button" onClick={() => setActivePopover('load')}>
              <small>Manually Load</small>
            </button>
          </div>
          <div>
            <button id="easyjobapps" onClick={ () => handleApplyButton() }>Apply</button>
          </div>
        </div>
      </div>  

      {!companyName ? (
        <div id="uploadmessagetouser">
          <h2 style={{paddingLeft:'8px'}}>Fill forms and upload resumes fine-tuned by AI.</h2> 
        </div>
      ) : (
        <div id="jobpostcontainer" style={{ paddingLeft: '8px' }}> 
          <p>
            <b>Company</b>: <span className="companyname">{companyName}</span>
            <br />
            <b>Job Title:</b> <span id="jobtitle">{jobTitle}</span>
            <br />
            <b>Description:</b> <button type="button" onClick={() => setActivePopover('edit')}>View/Edit</button>
            <br />
            <button id="clearpost" onClick={handleClearPostLocal}>Clear</button>
          </p>
        </div>
      )}

      {activePopover === 'load' && (
        // <Popover id="loadpostcontainer" title="Load Post" onClose={() => setActivePopover(null)}>
        //   <div style={{ margin: '15px', background: '#eee' }}>
        //     <small>
        //       <b>Either:</b>
        //       <code>'Search'</code> past uploads by company name or
        //       <code>'Upload'</code> a job description.
        //     </small>
        //   </div>
        //   <label style={{ display: 'block', marginBottom: '.5rem' }}>
        //     Company Name:
        //   </label>
        //   <div style={{ marginBottom: '1rem' }}>
        //     <input 
        //       placeholder="Search" 
        //       id="companyname" 
        //       onChange={handleSearchCompany}  
        //     />
        //   </div>
        //   { companies && (
        //     companies.map((company, i) => (
        //       <div key={i} style={{ marginBottom: '1rem' }}>
        //         <details>
        //           <summary>{company.companyName}</summary> 
        //           {
        //             company.posts?.map((post, j) => (
        //               <div key={j}>
        //                 <button type="button" onClick={() => handleLoadPostById(post?.id)}>Load</button> - {post.jobTitle}
        //               </div>  
        //             ))
        //           } 
        //         </details>
        //       </div>
        //     ))
        //   )}
        //   <label style={{ display: 'block', marginBottom: '.5rem' }}>
        //     Job Post Text:
        //   </label>
        //   <textarea
        //     id="postText"
        //     style={{ height: '100px' }}
        //     placeholder="Enter the post"
        //     value={postText}
        //     onChange={handleManualLoadTextChange}
        //   />
        //   <button 
        //     className="finishAndUpload"  
        //     onClick={handleManualUploadPost}>
        //       Upload
        //   </button>
        // </Popover> 
          <ManualPostPopover
            companies={companies}
            postText={postText}
            setpostText={setpostText}
            onClose={() => setActivePopover(null)}
            handleSearchCompany={handleSearchCompany}
            handleLoadPostById={handleLoadPostById}
            handleManualUploadPost={handleManualUploadPost}
          /> 
      )}

      {activePopover === 'edit' && (
        <EditPostPopover 
          initialJobDescription={jobDescription}
          onClose={() => setActivePopover(null)}
          onUpdate={handleUpdatePost}
        />
      )}
    </div>
  );
}

export default UploadPostComponent;