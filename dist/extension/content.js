// content.js

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log("content.js received message:", request);
  let action = request.action;
  let data;
  if (action === "getForms") { data = await getForms(request); } 
  else if (action === "fillForms") { data = await fillForms(request); } 
  else if (action === "askQuestion") {data = await askQuestion(request); } 
  else if (action === "selectForm") {data = await selectForm(request); } 
  else {data = { error: "Invalid action" }; }
  chrome.runtime.sendMessage({ action, ...data });
  return true;
});


// Non Iframes, highlight and onclick get inputs.
// For Iframes, Inspect iframe, clipboard paste command.

// 
let style = "position: fixed; bottom: 0; right: 0; z-index: 9999; padding: 10px; background: #000; color: #fff; border: none; cursor: pointer;"
async function selectForm(request) {
  console.log("Select Form", request); 
  const container = document.createElement("div");
  container.style = style;    
  let log = document.createElement("div"); 
  container.appendChild(log);
  document.body.appendChild(container);
  log.innerHTML = "Click to copy"; 
  log.addEventListener("click", () =>{
    let txt = `
let req = ${JSON.stringify(request)};
let fillForm = ${window.fillForm.toString()}; 

let text = document.querySelector('form').outerHTML;   
fillFormsOptions = JSON.stringify(text, null, 2); 

console.log('fillFormsOptions', fillFormsOptions);  

fillForm({...req, fillFormsOptions});
    `;
    navigator.clipboard.writeText(txt); 
    log.innerHTML = "Paste in console.";
  }, true);  
 
}
  // Event Listener
  
  // let removeHighlight = (event) => { event.target.style.border = ""; } 
  // let highlightElement = (event) => { event.target.style.border = "2px solid red"; }
  // document.addEventListener("mouseover", highlightElement );
  // document.addEventListener("mouseout", removeHighlight);
  // document.addEventListener("click", changeBackgroundAndLog, true); 
  /*function changeBackgroundAndLog(event) {
    console.log("CHANGE");
    // while (container.firstChild) { container.removeChild(container.firstChild); }
    let selected = event.target;
    let iframe = selected.tagName.toLowerCase() === "iframe" ? selected : selected.querySelector("iframe");
    if (iframe) {
      console.log("iframe", iframe);
      delete request.postupload; 
    } 
    else { 
      console.log('Formn Selected. Calling Fill Form:')
      fillForm({ ...request, selected: selected.outerHTML }); 
    }
    container.appendChild(log);
    document.removeEventListener("mouseover", highlightElement);
    document.removeEventListener("mouseout", removeHighlight);
    document.removeEventListener("click", changeBackgroundAndLog, true);
    //  document.querySelectorAll("*").forEach(el => { if (el.style.border === "2px solid red") { el.style.border = ""; } });
    selected.style.border = "";
    selected.style.background = "rgba(173, 216, 230, 0.5)";
    event.preventDefault();
    event.stopPropagation();
  }*/
 

window.getForms = async function (request) { 
  let {postId, companyName, jobName, fillFormsMessage} = request     
  // let body = document.querySelector("body");
  let forms = document.querySelectorAll('form');
  let returnThis = []
  forms.forEach(form => { 
    let removeThese = "script,style,link,meta,comment,noscript,svg,iframe,image,video,auido,canvas,iframe";
    form.querySelectorAll(removeThese).forEach(e => e.remove());
    returnThis.push(form.outerHTML);
  }) 
  console.log("Retrieved Forms: ", {returnThis});

  let data = { forms: returnThis };
  return data 
 
    
};

window.fillForms = async function fillForms(request) {
  let {fillFormsOptions} = request;
  fillFormsOptions = JSON.parse(fillFormsOptions);
  console.log("Fill Form(s)", request, fillFormsOptions);
 fillFormsOptions.map( optionData => { 
    let { getElementById, querySelector, type, informationRequested, userSelection, resumeUrl, coverletterUrl } = optionData;
    console.log(informationRequested, userSelection)
    let el = document.getElementById(getElementById);
    if (!el) { el = document.querySelector(querySelector); }
    if (!el) { console.log("Element Not Found", { el, option: optionData }); }
    if (type === "file" || type === "hidden") {
      console.log('FILE UPLOAD', { optionData, el, userSelection }); 
      if(informationRequested.toLowerCase().includes("resume")) {
        
      }
      if(informationRequested.toLowerCase().includes("cover")) {

      }
      return 
    } 
    else if (type === "text" || type === "textbox" || type === "textarea" || type === "email") { el.value = userSelection; }
    else {
      userSelection.map( selection => {
        let option = document.querySelector(selection.optionSelector);
        if (!option) { console.log("Option Not Found", { el, selection }); return }
        if (type === "radio" || type === "checkbox") { if (!option.checked) { option.click(); } }
        else if (type === "dropdown") { option.selected = true; }
        const changeEvent = new Event("change", { bubbles: true }); option.dispatchEvent(changeEvent);
        const event = new Event("input", { bubbles: true });        option.dispatchEvent(event);
      })
    }
  })

} 


/*
fillFormsOptions = [
  {"getElementById":"form_job_alert_1_3_0","type":"hidden","informationRequested":"Job Alert","userSelection":"job_alert"},
  {"getElementById":"form_departments_1_3","type":"select","informationRequested":"Departments","userSelection":[]},
  {"getElementById":"form_locations_1_3","type":"select","informationRequested":"Locations","userSelection":[]},
  {"getElementById":"form_first_name_1_3_1","type":"text","informationRequested":"First Name","userSelection":""},
  {"getElementById":"form_last_name_1_3_2","type":"text","informationRequested":"Last Name","userSelection":""},
  {"getElementById":"form_email_1_3_3","type":"email","informationRequested":"Email","userSelection":""},
  {"getElementById":"form_first_name_3_0_0","querySelector":".form-control","type":"text","informationRequested":"First Name","userSelection":"Charles"},
  {"getElementById":"form_last_name_3_0_1","querySelector":".form-control","type":"text","informationRequested":"Last Name","userSelection":"Karpati"},
  {"getElementById":"form_email_3_0_2","querySelector":".form-control","type":"email","informationRequested":"Email","userSelection":"Charles.Karpati@gmail.com"},
  {"querySelector":"#question_3_0_3_0_2_option_647e7f57d0900e8718a0c7864da97d19","type":"checkbox","informationRequested":"Location Preference","userSelection":[{"optionSelector":"#question_3_0_3_0_2_option_647e7f57d0900e8718a0c7864da97d19","optionDisplayText":"Remote"}]},
  {"querySelector":"#question_3_0_3_0_3","type":"dropdown","informationRequested":"Have you been employed by Upstart before?","userSelection":[{"optionSelector":"option[value='1f766da32d5c4a68a19b387a27a25719']","optionDisplayText":"No"}]},
  {"querySelector":"#question_3_0_3_2_0","type":"dropdown","informationRequested":"Disability Status","userSelection":[{"optionSelector":"option[value='6949e84b5b491b7e3b11fdd0d101b16e']","optionDisplayText":"I do not want to answer"}]},
  {"querySelector":"#question_3_0_3_2_1","type":"dropdown","informationRequested":"Veteran Status","userSelection":[{"optionSelector":"option[value='2f33c43523b27f41d1f22343996e1eda']","optionDisplayText":"I don't wish to answer"}]},
  {"querySelector":"#question_3_0_3_2_2","type":"dropdown","informationRequested":"Race","userSelection":[{"optionSelector":"option[value='de6093be27da5a044c304d3deb1df61e']","optionDisplayText":"Decline To Self Identify"}]},
  {"querySelector":"#question_3_0_3_2_3","type":"dropdown","informationRequested":"Gender","userSelection":[{"optionSelector":"option[value='6b296a245419fe825483fab3fd831c91']","optionDisplayText":"Decline To Self Identify"}]}]
*/