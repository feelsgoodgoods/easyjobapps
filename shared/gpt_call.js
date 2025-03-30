// console.log("gptcall.js: Loaded");
let key = false; 
let inBrowser = typeof window != 'undefined';
let cfpages = typeof process == 'undefined'; 

import { db } from './db.js';

async function handleCreditUpdate(userId, usageData) {
  
  console.log(":callChatGPT:USAGE:", usageData);
  const totalTokensUsed = usageData.total_tokens || 0;

  // Step 1: Update credits in the database (shared between client and server)
  await db.credits_update(userId, totalTokensUsed);

  // Step 2: Conditionally update users.json on the server (dynamic import)
  if (!inBrowser) {
    const { updateUserCredits } = await import('../server/index_middleware.js');
    await updateUserCredits(userId, totalTokensUsed);
  }
}

//
//
//
//
//
//
//
// AI FUNCTIONS
//
//
//
//
//
//
//
let getKey = async () => {
  // console.log('getkeys', inBrowser)
  if (!inBrowser) {
    // console.log('utils_gpt_call: getKey: Server')
    key = process.env.YOUR_OPENAI_API_KEY;
    if(!cfpages){ }else{} 
  }
  else{   
    let val = window?.userData?.openaikey; // set from app_account
    let exists = val != "undefined" && val[0]
    // console.log('callgpt ls openaikey val', val)
    val = val?.[0]?.text 
    console.log('Using key', val)
    if (exists) { key = val; } 
    else { key = ''; console.log("Browser: Error. No key."); }
  }
  return key;
}

/*
https://platform.openai.com/docs/api-reference/fine-tuning/create
https://platform.openai.com/docs/guides/text-generation/chat-completions-api  
https://platform.openai.com/docs/models
https://openai.com/api/pricing/
gpt-4x-x supports a 128k context, Vision. 
gpt-4o                $5.00 / 1M input | $15. / 1M output
gpt-4o-mini	          $0.15 / 1M input | $0.6 / 1M output 
gpt-3.5-turbo-0125    $0.50 / 1M input | $1.50 / 1M output 
text-moderation-latest    32,768 input | Free
*/

// input_tokens: 16,385, output_tokens: min(4096, remaining_input_tokens)
// MAX BACK 4096 tokens
// note that the message content may be partially cut off if finish_reason="length",
// which indicates the generation exceeded max_tokens or the conversation exceeded the max context length.

async function callChatGPT(
  post, 
  type = "gpt-4o-mini", 
  max_tokens = 4096, // only applies for completion tokens
  tools = false, 
  chat = false,
  user_id = false,
  oaikey = false
) {
  let key = oaikey || await getKey(); 
  if (!key) { console.log("No key provided."); return false; }
  try {
    let headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
    if (!Array.isArray(post)) { post = [{ role: "user", content: post }]; }
    let data = {
      model: type,
      messages: post,
      temperature: 0, // 0-2 randomness
      max_tokens: max_tokens, // Uses @max 2000 of available tokens for response.
      top_p: 0.1, // 0-1 nucleus sampling
      frequency_penalty: 0, // 0-2 decreases word repetition
      presence_penalty: 0, // 0-2 increases topic diversity. bad for json
      ...(chat ? {} : !!tools ? { tool_choice: "auto", tools: tools } : { response_format: { type: "json_object" } })
    }; 
    let url = "https://api.openai.com/v1/chat/completions"; 
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(data) }); 
    let chatGPTResponse;
    const responseData = await response.json(); 
    if(responseData.error){
      console.log(':callChatGPT:ERROR:', responseData.error)
      console.log({data})
      return false
    }
    if (tools) { chatGPTResponse = responseData.choices[0].message.tool_calls[0]; } 
    else { chatGPTResponse = responseData.choices[0].message.content; }  
    oaikey || await handleCreditUpdate(user_id, responseData.usage);
    /*
      {
        prompt_tokens: 296,
        completion_tokens: 57,
        total_tokens: 353,
        prompt_tokens_details: { cached_tokens: 0 },
        completion_tokens_details: { reasoning_tokens: 0 }
      }
    */
    return chatGPTResponse; 
  } catch (error) {
    let leng = JSON.stringify(post).length;
    console.log(":callChatGPT:BASIC_ERROR:", error, { leng });
    return false;
  }
}

function splitTextIntoChunks(text, chunkSize, overlapFraction = 0.1) {
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    const chunk = text.slice(startIndex, startIndex + chunkSize);
    chunks.push(chunk);
    if (chunkSize >= text.length) {
      break;
    }
    startIndex += chunkSize * overlapFraction; // Overlap by 1/n of the chunkSize
  }
  return chunks;
}

const mergeRecords = async records => {
  if (records.length === 1) return records;
  let merged = records.reduce((acc, cur) => {
    Object.keys(cur).forEach(key => {
      let curVal = cur[key];
      curVal = curVal === undefined || curVal === "" ? [] : curVal;
      curVal = Array.isArray(curVal) ? curVal : [curVal];
      acc[key] = [...new Set((acc[key] || []).concat(curVal))];
    });
    return acc;
  }, {});
  console.log('~~~~~~~~~~~~~~~~ CALLING mergeRecords::~~~~~~~~~~')
  merged = await callChatGPT([
    {
      role: "system",
      content: `
Refine the provided JSON object, which consists of multiple attributes, 
each explicitly an array containing similar but distinct data entries. 
Your task is to intelligently analyze and consolidate these entries within 
each attribute's array. Aim to merge similar entries to eliminate redundancies 
and slight variations, such as differences in phrasing or detail, 
ensuring no unique information is lost. The output should maintain the original 
JSON structure, explicitly ensuring that each attribute remains an array, 
now streamlined to include only unique, consolidated entries. The goal is a clean, 
deduplicated JSON object that accurately represents the original data in the most 
concise and structured form possible, with every attribute preserved as an array.
`
    },
    { role: "user", content: JSON.stringify(merged) }
  ]);
  return JSON.parse(merged);
};

export { callChatGPT, splitTextIntoChunks, mergeRecords };