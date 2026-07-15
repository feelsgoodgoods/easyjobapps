console.log("content.js: Loaded"); 

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log("content.js received message:", request);
  let action = request.action;
  let data;
  if (action === "getPost") { data = await getPost(request); } 
  else if (action === "getForms") { data = await getForms(request); } 
  else if (action === "fillForms") { data = await fillForms(request); } 
  else if (action === "askQuestion") {data = await askQuestion(request); } 
  else if (action === "selectForm") {data = await selectForm(request); } 
  else {data = { error: "Invalid action" }; }
  chrome.runtime.sendMessage({ action, ...data });
  return true;
});

async function getPost(request){  
  // document
  // console.log('Get Post Window:', {window, document})
  // console.log(window)
  let elements = window.getSelection().selectAllChildren(document.body)
  const pageText = window.getSelection().toString() 
  const currentUrl = window.location.href;

  const returnThis = `TEXT RETRIEVED FROM : \n\n ${currentUrl} \n\n TEXT: \n\n ${pageText}`; 

  let data = { text: returnThis } //, url: currentUrl };
  console.log(":CONTENTJS: getPost finished,  ", {data});
  return data 
}

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
  console.log("CONTENTJS: Get Forms");
  let {postId, companyName, jobName, fillFormsMessage} = request     
  // let body = document.querySelector("body");
  // let forms = document.querySelectorAll('form');
  let returnThis = []
  let removeThese = "script,style,link,meta,comment,noscript,svg,iframe,image,video,audio,canvas,iframe";
  // forms.forEach(form => { 
  //   form.querySelectorAll(removeThese).forEach(e => e.remove());
  //   returnThis.push(form.outerHTML);
  // })
  // console.log("Content:getForms: ", {returnThis});

  // if no forms
  // if (returnThis.length === 0) { 
    // Grab the entire page w the removeThese removed
  let body = document.querySelector("body");
  body.querySelectorAll(removeThese).forEach(e => e.remove());
  returnThis.push(body.outerHTML);
  // }

  let data = { forms: returnThis };
  return data 
};

window.fillForms = async function fillForms(request) { 
  let fillFormsOptions = JSON.parse(request.fillFormsOptions);
  console.log("123Fill Form(s)", request, fillFormsOptions);
  
  for (let optionData of fillFormsOptions) { 
    let { getElementById, querySelector, type, informationRequested, userSelection, fileContent, fileName } = optionData;
    console.log(informationRequested, userSelection);
    let el = document.getElementById(getElementById);
    if (!el) { el = document.querySelector(querySelector); }
    if (!el) { console.log("Element Not Found", { el, option: optionData }); continue; }

    // 
    // 
    //
    if (type === "input" || type === "text" || type === "textbox" || type === "textarea" || type === "email" || type === "select") { 
      el.value = userSelection;
      const inputEvent = new Event("input", { bubbles: true });
      el.dispatchEvent(inputEvent);
      const changeEvent = new Event("change", { bubbles: true });
      el.dispatchEvent(changeEvent);
    } 

    //
    // Radio / Checkbox
    //
    if (typeof userSelection === "object") {  
      userSelection.forEach(selection => { 
        let option = document.querySelector(selection.optionSelector);
        if (!option) { 
          console.log("Option Not Found", { el, selection }); 
          return; 
        }
        if (type === "radio" || type === "checkbox") { 
          if (!option.checked) { 
            option.click(); 
          } 
        } else if (type === "dropdown") { 
          option.selected = true; 
        }
        const changeEvent = new Event("change", { bubbles: true });
        option.dispatchEvent(changeEvent);
        const inputEvent = new Event("input", { bubbles: true });
        option.dispatchEvent(inputEvent);
      });
    }

    //
    // Resume / Cover Letter
    //
    if (type === "file" && fileContent && fileName) {
      console.log('FILE UPLOAD', { optionData });
      const byteCharacters = atob(fileContent.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      el.files = dataTransfer.files;
      
      const changeEvent = new Event("change", { bubbles: true });
      el.dispatchEvent(changeEvent);
    } 
  }
};



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






// 
// STATIC VARIABLES
// 
let resume = `Charles Karpati
Washington D.C.
301-300-4728; charles.karpati@gmail.com
Work Experience:
Software Developer
Developer, Easy Job Apps
5331 Pooks Hill Rd, Bethesda, MD (remote)
3/2024 - 6/2024, Hours per week: 40
Duties, Accomplishments and Related Skills:
• Designed and implemented an AI Chrome Extension to automate form filling. Upload documents, scan
webpages, fill forms (React, Sqlite).
•
• Developed using best practices and guidelines for AI safety to ensure no misuse of the system (JWT,
Tokens, OAuth2, Cookies, Sessions).
• Designed backend database infrastructure and file management plan.
• Elicited requirements from customers and assessed their needs to resolve their problems and satisfy
expectations.
• Employed machine learning algorithms to develop models and trained and fine-tuned AI large language
models and tested them for quality and safety.
• Researched and installed a server rack to self-host private, on-premise cloud services to save costs.
• Registered the domain and managed records for each subdomain to properly host the site.
• Configured SSL, TLS, Certificate Management for each domain.
• Automated DDNS IP updates for the private cloud (Bash, Cloudflare API, Cron) to ensure up-time.
• Re-implementated Sqlite on the browser to share code between server and browser.
• Engineered each server using a suite of installation, startup, and setup scripts (SystemD, .bashrc, Cron,
Apache, NginX, Express).
• Researched and developed a dev-ops pipeline for CI and CD (SFTP, SSH, Cron, DockerCompose).
• Produced and hosted a Latex2PDF service, and an Html2Img, Html2Md, Html2Txt service (PM2,
Docker, DockerSwarm, Venv).
• Worked with modern ML best-practices and tooling, like those coming from Langchain, Huggingface,
Vertex, and OpenAI. Matplotlib, Numpy, and TensorFlow.
Supervisor: Charles Karpati (301-300-4728)
Okay to contact this Supervisor: Yes
Chief Technology Officer
Addy-Ai
5331 Pooks Hill Rd, Bethesda, MD (remote)
5/2023 - 2/2024, Hours per week: 40
Duties, Accomplishments and Related Skills:
• Co-Founder of AddyAI, an automated AI email response service with over 10000+ users.
• Communicated complex AI concepts to technical and non-technical audiences when marketing our
product and raising funds with general public
• Pitched to fortune 500 companies, venture capital funds, and three different mayors.
• Received a $10 million valuation during the pre-seed fund-raising phase.
• Developed Langdrive, an open-source automated LLM finetuning solution, complete with documen-
tation and tooling to create chatbots and connect to third-party services for document storage and
retrieval.
• Identified AI problems, determined relevance, and collaborated with team members to develop recom-
mendations and innovative solutions.
• Evaluated the capabilities, trustworthiness, and safety of these AI models.
• Created Addy’s admin panel which enabled AI email customization and third-party integrations.
• Evaluated model safeguards and used real-world adversarial tactics and techniques to identify failures,
vulnerabilities, and potential misuses.
• Designed automated diagram generation and code documentation solutions.
Supervisor: Michael Vandi (301-851-9470)
Okay to contact this Supervisor: Yes
Software Developer
Voxels.com
5331 Pooks Hill Rd, Bethesda, MD (remote)
3/2022 - 5/2023, Salary: $8,500.00 USD Per Month, Hours per week: 40
Duties, Accomplishments and Related Skills:
• Lead blockchain developer at a top metaverse company, spearheading web3 initiatives, and fostering
relationships with crypto-related business partners (Solidity, Ethers).
• Developed in-game enhancements like real-time video streaming and integration of the ”Proof-of-
Attendance-Protocol” for in-game events (Babylon, TypeScript).
• Collaborated with UI/UX engineers for site redesigns, and weekly incremental improvements.
• Identified, resolved, and documented a comprehensive list of software bugs.
• Documented system architecture and diagrammed the most complex parts.
• Provisioned and monitored critical infrastructure as needed (DigitalOcean, Heroku).
• Committed to providing quality products and services to our player base.
• Catalogued and resolved most all user-submitted issues with great attention to detail.
• Informed our community of developments, taking into account audience and environment cues.
• Enthusiastically engaged in team discussion, code reviews, and agile methodologies.
• Liaised with MDAO and similar to set NFT metadata standards for cross-metaverse interoperability.
• Offered pro bono metaverse development courses.
• Volunteered as a judge for HackaTRON 2022.
Supervisor: Ben Nolan (+6421770662)
Okay to contact this Supervisor: Yes
Lecturer
National Science Foundation
1/2020 - 11/2021
Duties, Accomplishments and Related Skills:
• Taught Python for Big Data to twenty graduate students from various universities.
• Planned educational curriculum in coordination with the universities.
• Mentored three students through their semester-long data science projects.
Web Developer
Baltimore Neighborhood Indicators Association
11 W Mt Royal Ave, Baltimore, MD
1/2017 - 11/2021, Salary: $5,000.00 USD Per Month, Hours per week: 40
Duties, Accomplishments and Related Skills:
• Generated 150 annual quality of life statistics used by Baltimore City’s agencies and non-profits.
• Met with the community and key stakeholders to ensure their needs are met and our data is useful.
• Acted as data steward, codified data management policies to enhance data integrity and analytical
capabilities.
• Administered the organization’s main website and digital presence (Geoloom.com, bniajfi.org) (Word-
Press, PHP, Jquery, SQL, Excel, Esri, Socrata).
• Designed Equity tracker, used by the mayor’s office to track DEI efforts in the city (Microsoft 365,
Power Apps).
• Established Business Integration Search tool, connects consumers to minority-owned businesses (PHP,
SQL).
• Engineered VitalSigns, generates BNIA’s core data (Ipynb, GeoPandas, Seaborn, Vega, Plotly, MySql,
PhpMyAdmin, PGAdmin, PostgreSQL).
• Developed CloseCrawl, pulls MD Courts data and filters for foreclosures (Python, MechanicalSoup).
• Developed TidyAddr, expertly cleans addresses in Baltimore City (Node).
• Constructed GuidePost, assesses longitudinal trends between communities (JavaScript, Plotly, Vega,
Leaflet).
• Assembled BOLD, search property records to study foreclosure trends (React, PHP, SQL, Leaflet).
• Formulated GreenPatterns, identifies greening strategies to reduce watershed runoff (React, PHP, SQL,
Leaflet).
• Engineered Dataplay, helps with data intake, cleaning, processing, and visualization.
• Developed Ipynb2web, converts python notebooks into HTML page assets with accompanying audio-
visual media.
• Generated FastStat, a chrome extension to quickly retrieve Baltimore City statistics.
Supervisor: Cheryl Knott (410-837-4377)
Okay to contact this Supervisor: Yes
Freelance Developer
Self-Employed
1/2009 - Present, Hours per week: 10
Duties, Accomplishments and Related Skills:
• Developed systems for clients including a law firm, an art school, and a major clothing brand.
• Generated Telegram Recap, creates mp3 chat recaps for telegram groups using AI, posted daily.
• Developed NEAR Library, received a grant from the NEAR protocol to build a virtual Library in the
metaverse.
• Engineered RideLogger, visualize GPS data captured from my phone using Termux.
• Developed PrintMaps, generate 3D printable boxes in the shape of a map.
• Generated PivotTable, a JavaScript powered Python library for interactive and sync-able data.
• Developed Ipynb2Web, convert python notebooks into assets ready for the web.
• Produced CryptoTrader, an algorithmic trading system - Made 40x returns in one year.
• Developed BT Lights, control an audio-responsive mesh-network of lights.
• Created GPT Watch, an android app for my android watch to ask chatGPT a question.
• Developed Music player, load local mp3 music, YouTube playlists and videos, or explore iTunes.
• Volunteered code to retrieve satellite data for maritime transparency with the Skylight Project.
Education
University of Maryland Baltimore County, Bethesda, MD, United States
Master of Science, Graduated 5/2020
Information Systems
University of Maryland Baltimore County, Bethesda, MD, United States
Bachelor of Science, Graduated 5/2016
Major: Information Systems
Relevant Coursework, Licenses, and Certifications
Certified Web Developer
Language Skills
Language Spoken Written Read
English Advanced Advanced Advanced
Spanish Intermediate Intermediate Intermediate
References
Name Employer Title Phone
Michael Vandi Addy-AI.com Founder 301-851-9470
Ben Nolan Voxels.com Owner +642-177-0662
Cheryl Knott Baltimore Neighborhood In-
dicators Association
Assistant Director 240-237-0526
Abdissa
Gutema
- Software Developer 240-393-8945
Additional Information
Additional skills: Node/JavaScript/TypeScript, Python, SQL, NoSQL, HTML, CSS, Bash, PHP, Java and
C++, React, Preact, Redux, Webpack, Express, Flask, Git, Docker, Heroku, Digital Ocean, WordPress,
AWS Lambda, EC2, S3, Google Cloud Console, Bootstrap, Ionic, Tailwind, Styled Components, Google
APIs, Cloudflare, Firebase, OAuth2, Twilio, Jira, Esri, Socrata, Leaflet, PostGIS, PostgreSQL, MySQL,
SQLite, Redis, GraphQL, Leaflet, D3, Babylon, Three, MatPlotLib, Seaborn, Vega, Plotly, Altair, Ten-
sorFlow, ONNX, OpenAI, Gradio, HuggingFace, Langchain, Numpy, Pandas, OpenSeas, Solidity, Ethers,
Infura, Alchemy, Web3
Awards:
• GitHub 2024 Open-Source Accelerator alumni - March-June 2024. (AddyAI)
• Venture Bridge Alumni, a Carnegie Mellon accelerator - Jun-Nov 2023. (AddyAI)
`;
let bio = `- Linkedin: https://www.linkedin.com/in/charles-karpati/
- Github: https://www.github.com/karpatic
- Email: charleskarpati@gmail.com
- Website: https://charleskarpati.com
- Phone: +1 301 300 4728
- Spouse of or is Military Veteran: False
- Disabilities: None
- Residency: Washington D.C.
- Citizenships: United States of America and Hungary (European Union)

I am Charles (Carlos) Karpati, 29 years old, Mexican Hungarian resident of Bethesda, Maryland. I have an MS in information systems from UMBC (May 2020). 

I have been coding since age 14 and have over a decade of software development experience. I hold a Master of Science in Information Systems from the University of Maryland, Baltimore County.
Post-graduation, I worked as a data scientist and full stack web developer for a University of Baltimore research institute where I contributed to over 95% of the project’s code. While there, I also served as the technical lead for a National Science Foundation (NSF) AI initiative, where I met my co-founder, Michael.

In my free time, I enjoy riding my electric unicycle and designing Bluetooth mesh light shows.

I am enthusiastic to grow in my career and to have teammates who help foster my development.




Name: Charles Karpati
Age: 30
Gender Identity: Non-Binary
Transgender? I don't wish to answer
Sexual Orientation: 
Email: Charles.karpati@gmail.com
Location: Washinton D.C.
Phone: 301-300-4728
LinkedIn Profile: https://www.linkedin.com/in/charles-karpati/
Are you currently authorized to work in the U.S.? Yes
Do you now, or will you in the future, require immigration sponsorship to work? No.
Do you live with a disability? No.
Are you a veteran? No.
Ethnicities: Hispanic`; 

let systemprompt = `Your job is to complete online job application forms and return valid json. { data : [] } 
To help, you will be given the applicants bio and resume.
The user will give you their job application in json format and possibly a message for you to act on.
What you return should look like: 
data : [ 
    { 
        getElementById: input id || false, 
        querySelector, 
        type: string => ['file', 'text', 'input', 'select', 'textbox', 'textarea', 'email', 'radio', 'checkbox', 'textarea'],
        informationRequested: string, 
        userSelection: string || options: [ { optionSelector, optionDisplayText}, ... ] 
    }, ... 
]
Where  
getElementById - id of input. Required if present. 
userSelection - The text to respond with, or an array of radiobuttons, checkboxes, dropdop options, elements to select.
optionSelector - The query selector of the option to select.
optionDisplayText - The text displayed in the option element. 

If the given text is not a job application form, return { data : [] } 

If a Resume or Cover Letter is requested and you are given the option of how, opt for uploading an attachment where possible where the type should be set to 'file' and the querySelector and getElementById should be set to the id of the file input.

Here is the applicants bio:
${bio}

Here is the applicants resume:
${resume}
`
