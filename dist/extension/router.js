// console.log("router.js: Loaded");

// CLIENT SIDE ROUTER:
// - CALLS TO CHATGPT, PUPPY and THE DB pipe through here

// client loads router which calls (local|server) handler which db|gpt functions

import { routes } from "./routes.js";
import { db } from "./dbroutes.js";
import { gpt } from "./gptroutes.js";
let routeFns = Object.assign({}, db);
routeFns = Object.assign(routeFns, gpt);

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

async function routeToClient(ep, endpoint, body, lsKey) {
  let responseData = [];
  let fname = ep.replaceAll("-", "_");
  fname = fname.replace(/:\w+/, "");
  fname = fname.replace(/\//g, "");
  body.lsKey &&= lsKey;
  let f = Object.keys(routeFns).find(fn => fn == fname);
  let fn = routeFns[f];
  if (fn) {
    responseData = await fn(body);
  } else {
    console.log("Router Error: Client DNE:", { endpoint, fname });
  }
  return responseData;
}

async function routeToServer(method, endpoint, body) {
  let headers = { "Content-Type": "application/json" };
  let url = "http://localhost:3001"; // "api.charleskarpati.com"
  response = await fetch(`${url}${endpoint}`, { method, headers, body });
  if (!response.ok) {
    console.log("Response not OK.");
    alert("Failed to send.");
    window.loading.style.display = "none";
  }
  return responseData;
}

async function route(event, endpoint, fetchType = false, cb = false) {
  let responseData = undefined;
  let response = false;
  if (!event && !endpoint && typeof fetchType == "string") {
    // console.log('Route: "GET_JSON" from localStorage', fetchType);
    responseData = localStorage.getItem(fetchType);
    try { 
      let temp = JSON.parse(responseData);
      responseData = temp;
    } catch (e) {}
  }
  if (responseData === undefined) {
    // fetchType : ['POST_JSON', 'GET_JSON', 'POST_BLOB']
    let lsKey = fetchType != "POST_BLOB" && fetchType;
    let method = !event || fetchType === "GET_JSON" ? "GET" : "POST";

    let body = {};
    let response = false;
    (method == "POST" || fetchType == "POST_BLOB") && ({ body } = await prepPost(event, fetchType));
    window.loading.style.display = "block";

    const route = routes.find(route => {
      const routeRegex = new RegExp(`^${route.endpoint.replace(/:\w+/g, ".+")}$`);
      if (routeRegex.test(endpoint)) {
        const routeParams = route.endpoint.match(/:\w+/g) || [];
        routeParams.forEach(param => {
          const key = param.slice(1);
          body[key] = endpoint.split("/").pop();
        });
      }
      return routeRegex.test(endpoint);
    });

    if (!route) {
      console.log("ERROR: Endpoint not found:", endpoint);
      window.loading.style.display = "none";
      return response;
    }
    window.email && (response = await routeToServer(route.endpoint, endpoint, body, lsKey));
    !window.email && (response = await routeToClient(route.endpoint, endpoint, body, lsKey));
    if (fetchType == "POST_BLOB") { 
      console.log("Route:END:method:", { endpoint, fetchType, response });
      responseData = response && await response?.blob();
      window.loading.style.display = "none";    
      showToast();
      return responseData;
    }
    if (!response?.status == "success") {
      console.error("ROUTER:ERROR:endpoint:", { endpoint, response });
      return false;
    }

    responseData = response.data;
    if (lsKey) {
      console.log('SAVING KEY:', lsKey, responseData)
      localStorage.setItem(lsKey, typeof responseData == "string" ? responseData : JSON.stringify(responseData));
    }
  }
  window.loading.style.display = "none";
  showToast();

  if (cb) {
    let resp = cb(responseData);
    responseData = resp;
    // console.log("Route:CB:", { endpoint, responseData });
  } else {
    console.log("Route:END:method:", { endpoint, fetchType, responseData });
  }
  return responseData;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function showToast() {
  const toastElement = document.getElementById("toast");
  toastElement.classList.add("show");
  setTimeout(() => {
    toastElement.classList.remove("show");
  }, 3000);
}

async function loggedIn() {
  if (!window.runningInBrowser) return true; // Server
  if (localStorage.getItem("loggedIn")) return true;
  return false;
}
window.loggedIn = loggedIn();

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export { route, showToast };
