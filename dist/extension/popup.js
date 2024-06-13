// popup.js

// console.log("popup.js: Loaded");

import { route, getLocalUserInfo, throttle, generate_resume, display_generated_text } from "./client.js";


// [postid, companyid, companyname, jobtitle,
//  postupload, questioninput, questionoutput]

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ UTILS

let logEnd = (txt) => {txt && console.log(":"+txt+":"); console.groupEnd();} 

// whenever user clicks on
// [ uploadesume, select file, drag-drop, paste text,
// next, back, tailor, select template, submit
// ]
let fileStateMgMt = (data={}) => { 
  // creates or retrieves object using data.id 
  let item = localStorage.getItem(data.id);
  if(item) item = JSON.parse(item); 
  else{
    item = { id : data.id }
    delete data.id; 
  }
  // update ls with new data
  Object.keys(data).forEach(key => {
    item[key] = data[key];
    localStorage.setItem(key, JSON.stringify(data[key]));
  });
}

async function getElements(){
  let elements = {
    // Document Editor
    openNewResume: document.getElementById('openNewResume'),
    editorHeader: document.getElementById('editorHeader'),
    uploadType: document.getElementById('uploadType'), // type
    uploadMethod: document.getElementById('uploadMethod'), 
    yesUpload: document.getElementById('yesupload'),
    uploadText: document.getElementById('uploadtext'),
    uploadTypeContainer: document.getElementById('uploadtypecontainer'),
    uploadInfoContainer: document.getElementById('uploadinfocontainer'),
    setuphelptemplate: document.getElementById('setuphelpTemplate'),
    tailorBool: document.getElementById('tailor-bool'), // tailor
    regenMessage: document.getElementById('regenmessage'), 
    templateBool: document.getElementById('template-bool'), // template  
    resumeTemplateOptions: document.getElementById('resume-template-options'),
    coverLetterTemplateOptions: document.getElementById('coverletter-template-options'), 
    // Post
    postUpload: document.getElementById('postupload'),
    companyName: document.getElementById('companyname'),
    jobTitle: document.getElementById('jobtitle'),
    postView: document.getElementById('postview'),
    clearAll: document.getElementById('clearall'),  
  };
  return elements;
}

async function setupEventListeners(){
  let els = await getElements();
  let { openNewResume, uploadType, tailorBool, templateBool } = els;

  const show = 'visibility: visible; opacity: 1; max-height: 3000px; max-width: 3000px;';
  const hide = 'visibility: hidden; opacity: 0; max-height: 0; max-width: 0;'; 
  const toggleBlock = (element) => { 
    element.style = element.style === show ? hide : show;
  };
  const swapBlocks = (showElement, hideElement) => { 
    showElement.style = show;
    hideElement.style = hide;
  };

  //
  // Upload Resume CLICKED
  //
  openNewResume.addEventListener('click', async function() {
    console.log('New Resume       click'); 
    let els = await getElements()
    const { editorHeader, uploadType, uploadMethod, tailorBool } = els; 
    editorHeader.innerHTML = 'New Resume'; 
    // set as resume and w file upload type
    uploadType.value = 'resume';
    uploadMethod.value = 'file';   
    uploadMethod.dispatchEvent(new Event('change'));
    tailorBool.dispatchEvent(new Event('change'));
  }); 
 
  //
  // Upload Method
  //
  uploadMethod.addEventListener('change', async function() {  
    console.log('uploadMethod    change', this.value);
    let els = await getElements();
    const { tailorBool, templateBool,uploadTypeContainer, uploadInfoContainer } = els;
    let isPaste = this.value === 'paste'   

    // Toggle Upload Box
    uploadTypeContainer.style.display = isPaste ? 'block' : 'none';
    uploadInfoContainer.style.display = isPaste ? 'none' : 'block';
    // Tailor Always Starts Off
    // tailorBool.value = '0';
    // tailorBool.dispatchEvent(new Event('change'));
    // Use template if 'Paste Text' is selected and not isunset. otherwise use noen
    
    let oldVal = templateBool.value 
    let setTo = isPaste && oldVal == 'none' && 'Compressed' || oldVal;
    // setTo = !isPaste && isNone ? 'Compressed' : 'none' || val;
    templateBool.value = setTo
    templateBool.dispatchEvent(new Event('change')); 
  });

  //
  // Tailor for each job?
  //
  tailorBool.addEventListener('change', async function() {
    console.log('tailorBool    change', this.value)
    let els = await getElements();
    const { regenMessage, templateBool } = els;
    let tailor = this.value === '1';
    // If tailor - Template is Req. Toggle Regen Message Always
    if (tailor) {
      regenMessage.style.display = 'block'; 
      let oldVal = templateBool.value 
      let setTo = isPaste && oldVal == 'none' && 'Compressed' || oldVal;
      templateBool.value = setTo; 
    } else {
      // if method not paste, then template is not required
      if(els.uploadMethod.value !== 'paste'){
        templateBool.value = 'none'; 
      } 
      regenMessage.style.display = 'none'; 
    }
    templateBool.dispatchEvent(new Event('change'));
  });

  //
  // Select a Template
  //
  templateBool.addEventListener('change', async function() {
    let els = await getElements();
    const { uploadType, uploadMethod, tailorBool, templateBool, setuphelptemplate } = els;

    console.log('templateBool change:',
      '\n uploadType', uploadType.value,
      '\n uploadMethod', uploadMethod.value,
      '\n tailorBool', tailorBool.value,
      '\n templateBool', templateBool.value
    );

    // Toggle 'None'
    let hideNone = uploadMethod.value == 'file' && tailorBool.value === '1';
    hideNone ||= uploadMethod.value == 'paste';
    templateBool.children[0].style = `display: ${hideNone ? 'none': 'block'}`

    // Toggle templates
    let templateimgs = setuphelptemplate.querySelectorAll('.templateimg');
    console.log('templateimgs', templateimgs)
    templateimgs.forEach(div => {
      let img = div.querySelector('img');
      div.style = img.alt == this.value ? show : hide;
    });
    
    document.getElementById('latex-textbox').style = this.value == 'Advanced' ? show : hide;
  });


  



let step = 0, steps = ['#setuphelpupload', '#setuphelptailor', '#setuphelpTemplate', '#setuphelpSubmit'];
steps = steps.map(s => document.querySelector(s));

function showStep(index) {
  window.setuphelpstep.innerHTML = index + 1
  steps.forEach((step, i) => step.style.display = i === index ? 'block' : 'none');
  document.getElementById('next').style.display = index === steps.length - 1 ? 'none' : 'block';
  document.getElementById('back').style.display = index === 0 ? 'none' : 'block';
}

function toggleStep(increment) {
  return (e) => {
    e.preventDefault();
    step += increment;
    showStep(step);
  };
}

document.getElementById('next').addEventListener('click', toggleStep(1));
document.getElementById('back').addEventListener('click', toggleStep(-1));

showStep(step);


  
  


  // // uploadMethod or Tailor - hide label if 'Paste Text' or 'File' + 'Tailor' is selected
  // if (
  //   uploadMethod.value === 'file' && tailorBool.value == '1' || 
  //   uploadMethod.value === 'paste'
  // ) {
  //   console.log('show label') 
  //   document.querySelector('label[for="rt0"]').style = show; 
  // }
  // else{
  //   console.log('hide label') 
  //   document.querySelector('label[for="rt0"]').style = hide;
  //   // document.querySelector('label[for="clt0"]').style = show;
  // }



  /* File Upload - Clicked */
  // document.getElementById('yesupload').addEventListener('click', async function(e) {
  //   console.log('File input changed');

  //   let els = await getElements();
  //   const { templateSelect, uploadMethod}  = els; 
    
  //   let el = document.getElementById('template-select');
  //   let no = el.children[0]; 

  //   document.getElementById('rt1').click();

  //   // Check if 'Paste Text' was previously selected and reset
  //   if (uploadMethod.value === 'paste') {
  //     uploadMethod.value = 'file';
  //     uploadMethod.dispatchEvent(new Event('change'));
  //   } else {
  //     no.disabled = false;
  //     no.click();
  //     no.dispatchEvent(new Event('change'));
  //     defalt.click();
  //   }
  // });

  // Toggle FAQ Tabs
  const helpTab = document.querySelector('#faq');
  helpTab.addEventListener('click', e => {
    if (e.target.tagName === 'SUMMARY') {
      const summaries = helpTab.querySelectorAll('summary');
      summaries.forEach(summary => {
        if (summary !== e.target){
          // check if open
          if(summary.parentNode.open) 
            summary.click();
        } 
          //summary.parentNode.removeAttribute('open');
      });
    }
  } );


  // BIO
  window.updatebio.onclick = async e => {
    e.preventDefault()
    console.log('updating bio')
    // check if the bio is different 
    await route(e, "/userinfo_update_settings", 'settings')
    window.loadFn()
  }

  //Load Tab
  window.postupload.addEventListener("input",throttle(e => localStorage.setItem("postupload", e.target.value, ""), 500) );
  window.companyname.addEventListener("input", throttle(search_company, 500));
  window.uploadpost.addEventListener("click", window.post_create);
  window.postview.addEventListener("click", () => post_view(window.postid.value));
  window.clearall.addEventListener("click", clearAll);

  // Extension Q/A 
  /*
  let questioninput = localStorage.getItem("questioninput");
  let questionoutput = localStorage.getItem("questionoutput");
  if (questioninput) window.questioninput.value = questioninput;
  if (questionoutput) window.questionoutput.value = JSON.parse(questionoutput).questionoutput;
  window.askquestion.addEventListener("click", askQuestion);
  */

  // const textarea = uploadText
  // textarea.addEventListener('input', function() {
  //     const latexPattern = /\\(?:begin|end|frac|sqrt|sum|int|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/;
  //     if (latexPattern.test(textarea.value)) { 
  //     } else {
  //       // window.regentip
  //     }
  // });

}

function setupLinkBehavior(selector, targetId, tabId=null, additionalTargetIds=[]) {
  const links = document.querySelectorAll(`a[href="${selector}"]`);
  links.forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      if (tabId) document.querySelector(tabId).click();
      if (additionalTargetIds) {
        additionalTargetIds.forEach(additionalTargetId => {
          const additionalElement = document.querySelector(additionalTargetId);
          const additionalSummary = additionalElement.querySelector('summary');
          if (additionalSummary && !additionalElement.open) additionalSummary.click();
          else if( additionalElement.tagName === "BUTTON"){
            additionalElement.click();
          }
        });
      }
        
      
      const el = document.querySelector(targetId); 
      console.log({el, targetId});
      const summary = el.querySelector('summary');
      if (summary && !el.open) summary.click();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.style.border = "1px solid red";
      setTimeout(() => { el.style.border = "none"; }, 1500);
    };
  });
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ INIT 

window.loadFn = async () => {
  console.group("POPUP:loadFn");

  /*
    let showFile = () => { 
      let file = localStorage.getItem('yesuploaded');
      console.log('SHOW FILE')
      console.log('file', file)
      if (file) {
        let decodedFile = JSON.parse(atob(file));
        console.log('decodedFile', decodedFile);
        document.getElementById('uploadinfocontainer').innerHTML = 'Uploaded: '+ decodedFile.name;
        // localStorage.removeItem('yesuploaded');
      }
    };
    
    // Set state in LS for when the popup closes on file select
  
    if (localStorage.getItem('yesuploadclicked') || '') {
      document.getElementById('openNewResume').click();
      localStorage.removeItem('yesuploadclicked');
      showFile();
    }
    
    document.getElementById('yesupload').addEventListener('click', function (e) { 
      // localStorage.setItem('yesuploadclicked', 'true');
    });
    
    document.getElementById('yesupload').addEventListener('change', function (e) {  
      let encodedFile = btoa(JSON.stringify({ name: e.target.files[0].name }));
      localStorage.setItem('yesuploaded', encodedFile);
      localStorage.setItem('yesuploadclicked', 'true');
      setTimeout(() => {
        localStorage.removeItem('yesuploadclicked');
      }, 1000);
      showFile();
    });
  */

  let userData = await getLocalUserInfo();

  let onboardingHandler = (userData) => {
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ handleUser', userData)
    let { openaikey, email, resumes, fullname, bio } = userData;
    let incomplete = !bio // || !fullname
    let newUser = !openaikey && !email;  
    let showAlert = (bool, id, msg) =>{
      window[id].innerHTML = msg; 
      window[id].style = bool ? "display: block;" : "display: none;";
    }
    if(incomplete){ 
      window.tabuser.click();
      // showAlert(true, 'alertsetup', "Please complete this page to continue.")
    }
    else if (newUser) {   
      window.tabuser.click(); 
      showAlert(true, 'alertsetup', "Login or add connect ChatGPT to continue.")
    }
    else if(!resumes.length){ 
      window.tabuser.click(); 
      showAlert(true, 'alertsetup', "You need to upload a resume.")
    } 
    else{
        window.tabpost.click();  
        window.alertsetup?.remove(); 
    }
      
    /*
    const disabledElements = ["tabpost", "generatecontent"];
    disabledElements.forEach(tab => { 
      let disable = newUser || incomplete || !resumes.length 
      let element = document.querySelector(`label[for="${tab}"]`);
      element.style = !disable ? "" : "opacity: 0.5;pointer-events: none;";
      element.disabled = disable; 
      let parent = element.parentNode;
      if(parent.tagName.toLowerCase() === "span"){  
        parent.style = !disable ? "" : "cursor: not-allowed;";
      }
    }); 
    */
  }
  onboardingHandler(userData); 
  
  if (!userData) { logEnd('Ending. No userData'); return false; }

  window.userData = userData;

  // Load, Create Tab 
  let postData = await populatePost();  

  let loadInfo = {
    userData,
    postData
  };

  console.log(":loadFn:", loadInfo);
  logEnd(''); 
};

// Fires only Once
const onLoad = ()=>{
  console.group("POPUP:onLoad");

  // Set CSS Variable
  const isChromeExtensionPopup = typeof chrome !== "undefined" && chrome.extension !== undefined && chrome.extension.getViews({ type: "popup" }).length > 0;
  isChromeExtensionPopup && document.body.setAttribute('data-chrome-extension', 'true');
  console.log({isChromeExtensionPopup})

  setupEventListeners();

  // Setup behavior for different links
  (()=>{ 
    // ----------------------- HREF ----------ID -------------- OPEN -------- OPEN
    setupLinkBehavior(".helpabout",    '#helpabout',          '#tabhelp');
    setupLinkBehavior(".helpuser",     '#helpuser',           '#tabhelp');
    setupLinkBehavior(".helppost",     '#helppost',           '#tabhelp');
    setupLinkBehavior(".qakey",        '#qakey',              '#tabhelp');
    setupLinkBehavior(".qacost",       '#qacost',             '#tabhelp');
    setupLinkBehavior(".helpsetupkey", '#helpsetupkey',       '#tabhelp',    ['#helpuser']);
    setupLinkBehavior(".helpsetupbio", '#helpsetupbio',       '#tabhelp',    ['#helpuser']);
    setupLinkBehavior(".setuphelpbio", '#setuphelpbio',       '#tabuser');
    setupLinkBehavior(".setuphelpkey", '#setuphelpkey',       '#tabuser');
    //                 .fromto 
    setupLinkBehavior(".helpsetupupload", '#helpsetupupload', '#tabhelp', ['#helpuser', '#closedocumenteditor']);  
    setupLinkBehavior(".helpsetuptailor", '#helpsetuptailor', '#tabhelp', ['#helpuser', '#closedocumenteditor']);
    setupLinkBehavior(".setuphelptailor", '#setuphelptailor', '#tabhelp', ['#openNewResume']);
    setupLinkBehavior(".setuphelpupload", '#setuphelpupload', '#tabhelp', ['#openNewResume']);
  })();
  
  window.loadFn(); 
  logEnd(''); 
}
window.onload = onLoad();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ POST OPERATIONS

function clearAll() {
  window.openaikey.value = "";
  window.companyname.value = "";
  window.jobtitle.value = "";
  window.postid.value = "";
  window.postupload.value = "";
  window.fillformsmessage.value = "";
  // window.questioninput.value = "";
  window.questionoutput.value = "";
  window.newresume.value = "";
  window.previewresume.style = "display='none'";
  let dash = window.dashlink;
  dash?.href && (dash.href = "http://localhost:3001/companys-view#detail-");
  let vars = ["postdata", "companyid", "resumeLatex", "coverletterLatex", "", "resumepdfurl", "companyname", "postid", "postupload", "fillformsmessage", "questioninput", "questionoutput", "jobtitle"];
  vars.map(item => localStorage.removeItem(item));
}
// the postupload, resumeLatex and coverletterLatex are saved in localstorage
// these valuer overide the postdata values


// load.uploadpost.click > post_create > populatepost
// load[handleCompanyNameInpt, loadpostview].click  => postview => populatepost

async function search_company(e){
  let valu = e?.target?.value;
  console.group("POPUP:search_company", valu);
  if (valu.length < 3) return;
  let data = await route({ postId: window.postid.value, companyName: valu }, "/search_company");
  if (!data) { 
    console.groupEnd();
    return 
  }

  let container = window.matches;
  container.style = "display: block;";
  container.innerHTML = "<summary>matches</summary>";
  // Iterate through the list of companies and their posts
  data.map(company => {
    let deetail = document.createElement("details");
    let summary = document.createElement("summary");
    summary.innerHTML = company.companyName;
    deetail.appendChild(summary);
    // Iterate through each post of the company
    company.posts.map(post => {
      let job = document.createElement("div");
      job.style = "display: flex;";
      let btn = document.createElement("button");
      btn.innerHTML = "Go";
      job.appendChild(btn);
      btn.onclick = e => {
        deetail.removeAttribute("open");
        post_view(post.id);
      };
      let tex = document.createElement("span");
      tex.style = `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
      job.appendChild(tex);
      tex.innerHTML = " - " + post.jobTitle;
      deetail.appendChild(job);
    });
    container.appendChild(deetail);
  }); 
  console.groupEnd();
  return
};

async function handlePost(id, endpoint) {
  console.groupCollapsed("POPUP:handlePost:", id, endpoint);
  let postData = await route( 
    { postId: id || window.postid.value, postUpload: window.postupload.value }, `/${endpoint}`, "postdata" );
  await populatePost(postData);
  console.groupEnd();
  return postData;
}
window.post_create = async e => handlePost(false, "post_create");
window.post_view = async id => handlePost(id, `post_view/${id || 0}`);

// called by [load, post_view, post_creat]
async function populatePost(postData) {
  let txt = "populatepost()";
  console.group(txt); 
  postData = postData || await route(false, false, "postdata"); 
  if (!postData) { logEnd(txt); return false; }
  let { company_id, id, companyName, jobTitle, text } = postData; 
  // console.log("postData", postData);

  // Set Misc Values
  window.companyname.value = companyName;
  window.jobtitle.value = jobTitle; 
  window.postupload.value = text;
  window.postid.value = id;
  window.companyid&&(window.companyid.value = company_id);
  document.querySelectorAll(`input[name="postid"]`).forEach(el => (el.value = id)); 
  document.querySelectorAll(`input[name="companyid"]`).forEach(el => (el.value = company_id)); 

  await createCreateTab(postData);
  logEnd(txt);
  return postData;
}

// displays PDF using ls.resumeLatex
async function createCreateTab(postData) {
  console.group("createApplicationPanl", { postData });
  let container = window.generatecontentcontainer;
  const generateOptions = dataArray => dataArray.map(resObj => `<option value="${resObj.id}">${resObj.title}</option>`).join("");
  const setupDropdown = key => {
    console.log("CREATING DROPDOWN FOR:", { key, userData });
    const messageOptions = generateOptions(window.userData[key + "messages"]);
    const templateOptions = generateOptions(window.userData[key + "s"]);
    container.querySelector(`[name="${key}id"]`).innerHTML = templateOptions;
    const messageDropdown = container.querySelector(`[name="${key}messageid"]`);
    messageDropdown.innerHTML = messageOptions;
    messageDropdown.addEventListener("change", event => {
      const message = window[key + "messages"].find(msg => msg.id == event.target.value);
      container.querySelector(`[name="message${key}"]`).innerHTML = message.text;
    });
    container.querySelector(`[name="message${key}"]`).innerHTML = window.userData[key + "messages"][0]?.text || "";
  }; 
  setupDropdown("resume");
  setupDropdown("coverletter"); 
  container.querySelector('button[name="generateresume"]').onclick = e => generate_resume(e);   
  await display_generated_text("resume", postData, false); 
  console.groupEnd();
  return 
  
  /*
  postData.resume = newResume; 
  localStorage.setItem("postData", JSON.stringify(postData));
  */
  // setupDropdown("email"); 
  // container.querySelector('[name="emailapplicationto"]').value = meta.emailApplicationTo || "";
  // container.querySelector('[name="emailapplicationsubjectline"]').value = meta.emailApplicationSubjectLine || ""; 

  // let coverLetter = localStorage.getItem(`coverletterLatex`) || "";
  // display_pdf_text("coverletter", { newCoverLetter: coverLetter });
  // await display_pdf_text("coverletter", { newCoverLetter: latex }, false); 
  // container.querySelector('button[name="generatecoverletter"]').onclick = e => generateCoverLetter(e);
  // resume && route({ newResume:resume||'', company_id, post_id:id+"", useSaved:true }, "generate_pdf", "resumepdfurl");
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Extension Specific Operations
// TAB:Q/A  - chatGPT/queryDB
async function askQuestion(request) {
  console.log("Ask Question");
  localStorage.setItem("questioninput", window.questioninput.value);
  let questionInput = window.questioninput.value;
  // let companyId = parseInt(request.companyId) || 0;
  let postId = parseInt(window.postid.value) || 0;
  // post fetch to http://localhost:3001/fill-form with stringified inputOptions
  // get ls bio, resume
  let bio = localStorage.getItem("bio");
  let resume = localStorage.getItem("resumeLatex");
  if(!resume){
    resume = JSON.parse(localStorage.getItem("resumetemplates")); 
    resume = resume.find(item => item.title == "Default") || resume[0] 
    resume = resume?.text || "Resume Not Found";
  }
  let data = {
    questionInput: questionInput,
    postId: postId,
    bio: bio,
    resume: resume,
    post: window.postupload.value,
    companyName: window.companyname.value,
    jobTitle: window.jobtitle.value
  };
  let resp = await route(data, "/extension_ask_question", "questionoutput");
  window.questionoutput.value = resp.questionoutput;

  return data;
}
 
// event - selectForm
/*
window.selectform.addEventListener("click", async () => {
  let resp = await sendMessage("selectForm");
  // console.log('Response from content script:', resp);
  return resp;
});
*/

// event - fillForms
/*
window.fillforms.addEventListener("click", () => {
  sendMessage("getForms");
});
*/

// Send message to content script
async function sendMessage(action) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true
      },
      tabs => {
        if (tabs.length === 0) {
          reject(new Error("No active tab found."));
          return;
        }
        chrome.tabs.query(
          {
            active: true,
            currentWindow: true
          },
          function (tabs) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: action,
                companyName: window.companyname.value || "",
                jobTitle: window.jobtitle.value || "",
                // companyId: document.getElementById('companyId').value,
                postId: window.postid.value,
                // postExcerpt: document.getElementById('postExcerpt').value,
                postUpload: window.postupload.value,
                fillFormsMessage: window.fillformsmessage.value || "",
                fillFormsOptions: localStorage.getItem("fillFormsOptions") || '',
                questionInput: window.questioninput.value
              },
              function (response) {}
            );
          }
        );
      }
    );
  });
}

try{
  chrome.runtime.onMessage.addListener(async (data, sender, sendResponse) => {
    console.log("data", data);
    // askQuestion
    if (data.questionOutput) {
      window.questionoutput.value = data.questionOutput;
    }
    if(data.action == 'getForms'){  
      if(data.forms){  
        data.companyName = window.companyname.value,
        data.jobTitle = window.jobtitle.value,
        data.postId = window.postid.value;
        data.post = window.postupload.value;
        data.bio = window.bio.value; 
        data.resume = window.newresume.value;
        data.fillFormsMessage = window.fillformsmessage.value;
        let resp = await route( data, `/extension_fill_form`); 
        console.log('fillFormsOptions:', resp);
        let fillFormsOptions = resp.fillFormsOptions
        localStorage.setItem("fillFormsOptions", JSON.stringify(fillFormsOptions));
        sendMessage('fillForms')
        
      }
    }
  });
}catch(e){ 
}