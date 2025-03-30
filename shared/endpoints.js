function r_endpoint() { 
    let env = process.env
    let webp = env?.WEBPACK_ENV
    let node = env?.NODE_ENV
    console.log('port:', {
        'Webpack_ENV:': webp, 
        'NODE_ENV:':node
    });
    // Webpack:3001 proxies to index.js:3002 
    // services/pm/ecosystem.config.js == staging or production 
    let url = ""; 
    if (node === 'production') {   url = "https://easyjobapps.com" } 
    else if (node === 'staging') { url = `https://staging.easyjobapps.com`; } 
    else if (node === 'development') { url = `http://localhost:3001`; }
    else if (webp === 'development') { 
        if(window.location.href.includes('staging')){
            url = `https://staging.easyjobapps.com`; 
        }
        else{
            url = 'http://localhost:3001'; 

        } 
    } 
    else if (webp === 'production') {   url = window.origin; } // could be staging or not  
    else{ console.log('Unknown environment', env) } 
    // console.log(`Path: ${url}`)
    return url;
}

function p_endpoint(){
    let env = process.env 
    let wpe = env.WEBPACK_ENVIRONMENT
    if(wpe === 'development'){
        return 'http://127.0.0.1:4422/pandoc'
     }
     return "https://getfrom.net/pandoc" // 'https://getfrom.net/pdf/pandoc'    
}

// export for esm
export { r_endpoint, p_endpoint };