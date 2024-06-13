// console.log("sharedClient.js: Loaded");
window.runningInBrowser = typeof window !== "undefined" && window.document;
let isChromeExtension = window.chrome && chrome.runtime && true;
import { route, showToast } from "./router.js";

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//~~~~~~ Onstart

// Shared Start Script. Called From/ Calls window.loadFn
//
// Retrieve from Db and SET into LOCALSTORAGE [email, name, openaikey, bio, res/cl/email stuff]
// Sets EVT LISTENERS on their associated inputs
//


function throttle(func, limit) {
  let lastFunc;
  let lastRan; 
  return function() {
    console.log('throttted')
    const context = this;
    const args = arguments;
    if (!lastRan) {
      lastRan = Date.now();
      lastFunc = setTimeout(function() {
        console.log('runing first')
        func.apply(context, args);
      }, limit);
    } else {
      console.log('runing second')
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}
 

// Get User Info
async function getLocalUserInfo() {
  console.groupCollapsed(":client:load:"); //groupCollapsed
  console.log(Date());
  let w = window;

  // get
  let email = await route(false, false, "email") || false;
  let settings = await route(false, false, "settings"); // /userinfo_view/settings 
  
  let name, bio, key
  if(settings){
    console.log('settings') 
    key = settings.openaikey;
    // name = settings.fullname;
    bio = settings.bio;
    // w.fullname.value = name;
    w.openaikey.value = key;
    w.bio.value = bio;
  }

  // document.getElementById('template-select').addEventListener('change', function() {
  //   var messageDiv = document.getElementById('regenmessage');
  //   if (this.value == '1') {
  //     messageDiv.style.display = 'none';
  //   } else {
  //     messageDiv.style.display = 'block';
  //   }
  // });
  
  // todo uploadeddocuments
  // window.newdocument.onclick = async e => {
  //   e.preventDefault()
  //   window.documenteditor.style.display = 'block'
        
  // }

  // New Users
  let isUser = key || email;
  if (!isUser){ 
    console.groupEnd();
    return { //fullname: name, 
      openaikey: key, bio}
  }

  // get
  const sortDefaultFirst = arr => (arr?.length < 2 && arr) || arr.sort((a, b) => (a.title.toLowerCase() === "default" ? -1 : b.title.toLowerCase() === "default" ? 1 : a.title.localeCompare(b.title)));
  let resumes = await route(false, "/userinfo_view/resumetemplates", "resumetemplates", sortDefaultFirst);
  let resumemessages = await route(false, "/userinfo_view/resumemessages", "resumemessages", sortDefaultFirst);
  let coverletters = await route(false, "/userinfo_view/coverlettertemplates", "coverlettertemplates", sortDefaultFirst);
  let coverlettermessages = await route(false, "/userinfo_view/coverlettermessages", "coverlettermessages", sortDefaultFirst);
  let emails = await route(false, "/userinfo_view/emailtemplates", "emailtemplates", sortDefaultFirst);
  let emailmessages = await route(false, "/userinfo_view/emailmessages", "emailmessages", sortDefaultFirst);

  let userinfo = {
    email,
    // fullname: name,
    openaikey: key,
    bio,
    resumes,
    resumemessages,
    coverletters,
    coverlettermessages,
    emails,
    emailmessages
  };
  console.groupEnd();
  return userinfo;
}


  //
  // set              USERINFO TEMPLATE
  // listen on:       [upload, display]
  // of each of type: [template, message]
  // for each lbl:    [resume, coverletter, email]
  //
  /*
  let createUploadPanel = lbl => { 
    // Prep the template
    let div = document.createElement("div");
    let template = window.userinfotemplate.content.cloneNode(true);
    div.innerHTML = template.firstElementChild.outerHTML.replace(/{{{replace}}}/g, lbl);
    div.querySelectorAll(`button`).forEach(btn => (btn.onclick = userinfo_upload));
    // div.querySelector('summary[name="templates"]').onclick = e => userinfo_list("template", lbl);
    // div.querySelector('summary[name="messages"]').onclick = e => userinfo_list("message", lbl);
    console.log('appending', lbl)
    window.documentscontainer.appendChild(div);
  };
  ["resume", "coverletter", "email"].map(t => createUploadPanel(t));
  */

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//~~~~~~ User

// Upload new [resume, coverletter, email]
async function userinfo_upload(e) {
  console.group("CLIENT:USERINFO_UPLOAD:"); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  e.preventDefault();
  let clicked = e.target.form.querySelector("[name='label']").value; // == lbl+type+s
  let contents = await route(e, "/userinfo_upload");
  if (!contents){ 
    console.groupEnd();
    return;
  }
  let ls = JSON.parse(localStorage.getItem(clicked)) || [];
  ls.push(contents); 
  localStorage.setItem(clicked, JSON.stringify(ls));
  let summaries = document.querySelectorAll('summary[name="uploadedTemplates"]');
  summaries.forEach(summary => {
    let details = summary.closest("details");
    if (details.open) summary.click();
  });
  console.groupEnd();
}

// Onclick: Display the lbl: [resume, coverletter, email] list of type:[template, message]
// Attaches Onclick evt [update, remove]
async function userinfo_list(type, lbl) {
  console.group("CLIENT:USERINFO_LIST:"); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  let label = `${lbl}${type}s`;
  let records = await route(false, false, label);
  console.log({ label, records });
  let cid = lbl + "" + type + "uploads";
  let container = document.getElementById(cid);
  container.innerHTML = "";

  // List out templates or messages
  records?.map(resumeObj => {
    // console.log("CLIENT:USERINFO_LIST:Set:Onclick:For:")//, { lbl, type }, resumeObj); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // Clone the 'update' template
    const template = window.userinfoupdatetemplate.content.cloneNode(true);
    let div = document.createElement("div");
    div.innerHTML = template.firstElementChild.outerHTML.replace(/replaceThis/g, lbl);

    // Set values
    let { id, text, title } = resumeObj;
    div.querySelector("summary").innerHTML = title;
    div.querySelector("details").id = lbl + "-" + id;
    div.querySelector(`[name="title"]`).value = title;
    div.querySelector(`[name="userinfoid"]`).value = id;
    div.querySelector(`[name="label"]`).value = label;
    div.querySelector(`[name="text"]`).innerHTML = text;
    div.querySelector('button[name="update"]').onclick = userinfo_update;
    div.querySelector('button[name="remove"]').onclick = userinfo_remove;
    container.appendChild(div);
  });
  console.groupEnd();
}

function stopprop(e) {
  e.preventDefault();
  e.stopPropagation();
}

function userinfo_remove(e) {
  stopprop(e);
  route(e, "/userinfo_remove") && e.target.form.parentElement.remove();
}

function userinfo_update(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log("clciked");
  route(e, "/userinfo_update");
}
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//~~~~~~~ Create

//
// onstart - fill supplementalurls, instructionstoapplicant, applicationurlval,
// fills [companyid, postid]
//

//
// Updates LS postData.
async function generate_resume(event) {
  console.group(":generateResume:Using: ", event.target.form);
  event.preventDefault(event);
  let startTime = new Date().getTime();
  // check post data. 
  let resp = await route(event, "/resume_generate"); // returns text
  if (!resp) {
    console.groupEnd();
    return;
  }
  let { newResume } = resp; 

  let postData = await route(false, false, "postdata");
  postData.resume = newResume; 
  localStorage.setItem("postdata", JSON.stringify(postData));       // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Local Storage
  postData.newResume = newResume; 

  let endTime = new Date().getTime();
  let lapse = endTime - startTime;
  let lapseInSeconds = (lapse / 1000).toFixed(2);
  console.log(`Operation took ${lapseInSeconds} seconds`);
  await display_generated_text("resume", postData);
  console.groupEnd();
}

// Also attaches [Download, Refresh] event listeners.
async function display_generated_text(lbl, postData, generatePdf = true) {
  console.group(':Display Generated:', lbl, {postData});

  // Get the text
  let { company_id, id, newResume, resume, newCoverLetter } = postData;
  let newText = lbl === "resume" ?  (newResume || resume) : newCoverLetter; 
  let jobPostContainer = document.getElementById(`post-${company_id}-${id}`) || window.generatecontentcontainer;
  if(!newText){ console.log(':display_generated_text:NO TEXT TO DISPLAY'); console.groupEnd(); return }

  // Display the text
  jobPostContainer.querySelector(`[name="new${lbl}"]`).value = newText;

  let url = await generatepdf(lbl, postData, generatePdf); 
  console.log('URL:', url)
 
  if (url) {
    // open in new tab.  
    jobPostContainer.querySelector(`[name='preview${lbl}']`).src = url;
    jobPostContainer.querySelector(`[name='refresh${lbl}']`).style.display = "inline-block";
    jobPostContainer.querySelector(`[name='download${lbl}']`).style.display = "inline-block";
    jobPostContainer.querySelector(`[name='preview${lbl}']`).style.display = "inline-block";
    jobPostContainer.querySelector(`[name='resumepdflink']`).href = url;

    // Event Listener - Refresh
    let refreshBtn = jobPostContainer.querySelector(`[name="refresh${lbl}"]`);
    refreshBtn.onclick = async event => { 
      event.preventDefault(); 
      let newResume = window.newresume.value;
      postData.resume = newResume; 
      localStorage.setItem("postdata", JSON.stringify(postData)); // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Local Storage
      postData.newResume = newResume;
      await display_generated_text(lbl, postData, true); 
    };

    // Event Listener - Download
    let downloadPdf = (body) => {
      let {lbl, company_id, id} = body
      let a = document.createElement("a");
      a.href = jobPostContainer.querySelector(`[name="preview${lbl}"]`).src;
      a.download = `${lbl}-${company_id}-${id}.pdf`;
      a.click();
    };
    let downloadBtn = jobPostContainer.querySelector(`[name="download${lbl}"]`);
    downloadBtn.onclick = async event => { event.preventDefault(); await downloadPdf({lbl, company_id, id}); };
  }
  console.groupEnd();
  return 
}

async function generatepdf(lbl, body, generatePdf) {
  console.log(":client:generatepdf:force:"+ generatePdf);
  let jobPostContainer = document.getElementById(`post-${body.company_id}-${body.post_id}`);
  if (!jobPostContainer) {
    jobPostContainer = window.generatecontentcontainer; 
  }
  async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }
  let url = false;
  let pdfUrl = await route(false, false, `${lbl}PdfUrl`)             // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Local Storage
  if (generatePdf || !pdfUrl) {
    try {
      body.type = lbl;
      let blob = await route(body, "/generate_pdf", "POST_BLOB", false); 
      if (blob) {
        let base64 = await blobToBase64(blob);
        localStorage.setItem(`${lbl}PdfUrl`, base64);                // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Local Storage
        url = URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error("Failed to generate or fetch PDF: ", error); 
      return false;
    }
  } else {
    let base64 = pdfUrl;
    let byteString = atob(base64.split(",")[1]);
    let mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
    let ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    let blob = new Blob([ia], { type: mimeString });
    // console.log(`${lbl}PdfUrl`, !!pdfUrl, byteString, mimeString) 
    url = URL.createObjectURL(blob);
  } 
  return url;
}
export { route, showToast, throttle, getLocalUserInfo, generate_resume, display_generated_text };

  // Save the text
  // localStorage.setItem(`${lbl}Latex`, newText);
  // latex = JSON.parse(localStorage.getItem("resumetemplates"))[0].text; 