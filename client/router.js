// console.log("router.js: Loaded");

// CLIENT SIDE ROUTER:
// - CALLS TO CHATGPT, PUPPY and THE DB pipe through here

// client loads router which calls (local|server) handler which db|gpt functions

import { routes } from "../shared/routes.js";
import { db } from "../shared/db.js";
import { gpt } from "../shared/gpt.js";
let routeFns = Object.assign({}, db);
routeFns = Object.assign(routeFns, gpt);

import {r_endpoint} from '../shared/endpoints.js';   

// console.log('Router:Loaded:', { routes });

async function prepPost(event, fetchType) {
  let body = {};
  if (event.target) {
    event.preventDefault();
    const formData = new FormData(event.target.form);
    body = Object.fromEntries(formData);
  } else {
    //  if (fetchType != "POST_BLOB")
    body = event || {};
  }
  return { body };
}

// Appends window.userData[username, openaikey] to body
async function routeToClient(route, body, lsKey) {
  // console.log('Client - Route:TO_CLIENT:' , { route, body } )
  let responseData = {status: 'error', message: 'Error Unkown'};
  let fname = route.endpoint.replaceAll("-", "_").replace(/:\w+/, "").replace(/\//g, "");
  body.lsKey &&= lsKey;
  let f = Object.keys(routeFns).find(fn => fn == fname);
  let fn = routeFns[f];
  if (fn) {
    body.user_id = window?.userData?.username;  
    if (route.action.split(".")[0] == "gpt") {
      let apikey = window?.userData?.openaikey?.[0]?.text 
      apikey && (body.oaikey = apikey )
      if(!apikey){
        console.log('NO APIKEY:', window.userData);
        responseData.data = { 
          type: 'noGptKey', 
          error: 'This action requires ChatGPT. No credits or keys found. Please Login to buy credits.' 
        }
        return responseData
      }
    }  
    responseData = await fn(body);   
  } else {
    console.log("Router Error: Client DNE:", { endpoint: route.endpoint, fname });
  }
  // console.log('Router:TO_CLIENT:', route.endpoint, responseData);
  return responseData;
}

// Appends window.userData[username, openaikey] to body
async function routeToServer(route, body = {}) {
  // console.log('Route:TO_SERVER:' ); // , { method, endpoint, body }
  let url = r_endpoint();
  let jwt = window?.userData?.jwt || 'false';
  let headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`
  };
  // console.log('Route:LOGIC:', { route, body });
  
  // console.log('Route:TO_SERVER:', { method, endpoint, body, url }); 
  url = `${url}${route.endpoint}`; // "api.charleskarpati.com"   
  
  let fetchOptions = { method: route.method, headers };
  
  if (route.action.split(".")[0] == "gpt") {
    let apikey = window?.userData?.openaikey?.[0]?.text 
    apikey && (body.oaikey = apikey ) 
    !apikey && console.log('NO APIKEY:', window.userData);
  }

  // Only add body for POST requests  
  route.method == 'POST' ? (fetchOptions.body = JSON.stringify(body)) : (url = `${url}?${new URLSearchParams(body).toString()}`)
  // fetchOptions.credentials = 'include'; // cookies   
  
  try { 
    const response = await fetch(url, fetchOptions); 
    // if (!response.ok) {
    //   let status = response.status;
    //   console.log(`Response not OK. Status: ${status}`); 
    //   const contentType = response.headers.get("content-type"); 
    //   const lead = `Error: ${status}: `
    //   let message = lead + 'Unable To Fetch Resource.'
    //   if (contentType && contentType.includes("application/json")) { 
    //     let resp = await response.json();
    //     console.log('Response:', resp);
    //     message = lead + (resp?.type == 'credits' ?  'Insufficient Credits.': JSON.stringify(resp));
    //   }  
    //   console.log(message)
    //   alert(message);
    //   return null;
    // }
    
    let data = await response.json()  
    // console.log('Route:TO_SERVER:', { url, fetchOptions, response: data });
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    console.log("Failed to send.");   
    return null;
  }
}

window.getLS = (key) =>  { 
  let returnThis = localStorage.getItem(key);
  try { return JSON.parse(responseData); } catch (e) { return returnThis }
}

async function handleRouteLogic(event, endpoint, fetchType, lsKey) {
  // console.log('Route:LOGIC:', { event, endpoint, fetchType, lsKey });
  // fetchType : ['POST_JSON', 'GET_JSON', 'POST_BLOB'] 
  const method = !event || fetchType === "GET_JSON" ? "GET" : "POST";
  let body = {};
  let response = false;
  (method == "POST" || fetchType == "POST_BLOB") && ({ body } = await prepPost(event, fetchType)); 
  let route = routes.find(route => {
    // Replace dynamic segments like :label with a capturing group for any non-slash characters
    let temp = route.endpoint.replace(/:\w+/, '([^/]+)');
    const routeRegex = new RegExp(`^${temp}$`); 
    return routeRegex.test(endpoint);
  });

  if (!route) return console.log("ERROR: Endpoint not found:", endpoint) && response 

  // Clone the route and update the endpoint to match the route exactly 
  route = JSON.parse(JSON.stringify(route));
  route.endpoint = endpoint 

  // Add the dynamic part to the body
  const routeParams = route.endpoint.match(/:\w+/g) || [];
  routeParams.forEach(param => { body[param.slice(1)] = endpoint.split("/").pop() });   

  const specialConditions = ['/check-auth', '/login', '/signup'];
  
  // check if special conditions  
  const isSpecialCondition = specialConditions.includes(route.endpoint);  
  const isLoggedIn = !!window?.userData?.jwt;

  // console.log('Route:LOGIC:', { route, isSpecialCondition, isLoggedIn, jwt: window?.userData?.jwt });

  (isSpecialCondition || isLoggedIn) && (response = await routeToServer(route, body, lsKey));
  (!isSpecialCondition && !isLoggedIn) && (response = await routeToClient(route, body, lsKey));
  if (fetchType == "POST_BLOB") return responseData = response && await response?.blob() && responseData;
  if (!response?.status == "success") return console.error("ROUTER:ERROR:endpoint:", { endpoint, response }) && false 
  return response.data;
}

// Wrapper that calls actual ls or actual router. 
async function route(event, endpoint, fetchType = false, cb = false) {  
  const isPostBlob = fetchType === "POST_BLOB"; 
  let lsKey = !isPostBlob && fetchType; 
  const useLocalStorage = !event && !endpoint && typeof fetchType === "string"; 

  // Query
  window.loading.style.display = "block";
  let responseData = useLocalStorage ? getLS(lsKey) : await handleRouteLogic(event, endpoint, fetchType, lsKey);
  window.loading.style.display = "none";
  showToast();

  if (isPostBlob) return responseData;
  if (!responseData) return false

  if (cb) responseData = await cb(responseData);
  if (lsKey) localStorage.setItem(lsKey, typeof responseData === "string" ? responseData : JSON.stringify(responseData));
  if (lsKey) window.lskeys.push(lsKey)

  return responseData;
}
window.lskeys = [] // for logging purposes
window.logkeys = () => {
  console.log('LSKEYS:', window.lskeys)
  lskeys.map(k => console.log(k, getLS(k)))
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function showToast(text=false) {
  const toastElement = document.getElementById("toast");
  toastElement.classList.add("show");
  text && (toastElement.innerText = text);
  setTimeout(() => {
    toastElement.classList.remove("show");
  }, 3000);
}
 

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
window.route = route
window.showToast = showToast

export { route, showToast };