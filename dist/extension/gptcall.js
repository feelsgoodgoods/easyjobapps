let key = false;
let misc = false 
let queryDb = false
let inBrowser = typeof window != 'undefined';
let cfpages = typeof process == 'undefined'; 
let getKey = async () => {
  if (!inBrowser) {
    if(!cfpages){
      console.log('inDev')
      // require("dotenv").config();
      key = process.env.YOUR_OPENAI_API_KEY;
    }else{
      key = ''
      console.log("Server: Error. No key.");
    } 
  }
  else{
    // console.log('inBrowser')
    let val = localStorage.getItem("openaikey");
    let exists = val != "undefined";
    if (exists) {
      key = JSON.parse(val);
      key = key?.[0]?.text || false;
    } else {
      key = ''
      console.log("Browser: Error. No key.");
    }
  }
  return key;
}
/*
gpt-3.5-turbo-0125 is the flagship model of this family, supports a 16K context window and is optimized for dialog.
gpt-3.5-turbo-0125	Max: 16,385 tokens, Input: $0.0005 / 1K tokens, Output:	$0.0015 / 1K tokens
gpt-3.5-turbo-1106  Max: 16,385 tokens, Input: $0.0010 / 1K tokens, Output:	$0.0020 / 1K tokens

gpt-3.5-turbo-instruct is an Instruct model and only supports a 4K context window.
gpt-3.5-turbo-instruct	$0.0015 / 1K tokens	$0.0020 / 1K tokens
*/

// input_tokens: 16,385, output_tokens: min(4096, remaining_input_tokens)
// MAX BACK 4096 tokens
async function callChatGPT(
  post, 
  type = "gpt-3.5-turbo-0125", 
  max_tokens = 4096, 
  tools = false, 
  chat = false
) {
  let key = await getKey();
  //"gpt-3.5-turbo" // "gpt-4"
  // https://platform.openai.com/docs/models/gpt-3-5
  // https://platform.openai.com/docs/models/overview
  // https://platform.openai.com/docs/api-reference/fine-tuning/create
  // https://platform.openai.com/docs/guides/text-generation/chat-completions-api
  // https://openai.com/pricing
  // since the 16k version is twice the price of the 4k, check to see the post token length and use the 4k version if it's less than 4k
  try {
    let headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    };
    if (!Array.isArray(post)) {
      post = [{ role: "user", content: post }];
    }

    // note that the message content may be partially cut off if finish_reason="length",
    // which indicates the generation exceeded max_tokens or the conversation exceeded the max context length.
    let data = {
      model: type,
      messages: post,
      temperature: 0, // 0-2 randomness
      max_tokens: max_tokens, // Uses @max 2000 of available tokens for response.
      top_p: 0.1, // 0-1 nucleus sampling
      frequency_penalty: 0, // 0-2 decreases word repetition
      presence_penalty: 0, // 0-2 increases topic diversity. bad for json
      ...(chat ? {} : tools ? { tool_choice: "auto", tools: tools } : { response_format: { type: "json_object" } })
    };
    // console.log('SENDING', data)
    let url = "https://api.openai.com/v1/chat/completions";
    try {
      // console.log("sending", data);
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(data) });

      let chatGPTResponse;
      const responseData = await response.json();
      // console.log("gotback", responseData);
      if(responseData.error){
        console.log('gptcall:error:', responseData.error)
        console.log({data})
        return false
      }
      if (tools) {
        chatGPTResponse = responseData.choices[0].message.tool_calls[0];
      } else {
        chatGPTResponse = responseData.choices[0].message.content;
      }
      console.log(":gpt:", responseData.usage);
      return chatGPTResponse;
    } catch (error) {
      // console the  JSON.stringify(post) length
      let leng = JSON.stringify(post).length;
      console.log("callChatGPT Error Data:", error, { leng }, post);
      return false;
    }
  } catch (error) {
    console.error("callChatGPT error:", key, error); // Handle the error as needed
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

/*
async function callChatGPT_old(post, type = "gpt-3.5-turbo") {
  // https://platform.openai.com/docs/models/gpt-3-5
  // https://platform.openai.com/docs/models/overview
  // https://openai.com/pricing
  try {
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.YOUR_OPENAI_API_KEY}`
    }
    let data = {
      "model": type, // "gpt-4",
      "messages": [{ "role": "user", "content": post }],
      "temperature": 0, // 0-2 randomness
      "max_tokens": 2000, // Uses @max 2000 of available tokens for response.
      "top_p": 0.1, // 0-1 nucleus sampling 
      "frequency_penalty": 0, // 0-2 decreases word repetition
      "presence_penalty": 0 // 0-2 increases topic diversity. bad for json
    }
    let url = "https://api.openai.com/v1/chat/completions"
    try {
      const response = await post(url, data, { headers });
      console.log({ 'usage': response.data.usage })
      const chatGPTResponse = response.data.choices[0].message.content;

      return chatGPTResponse;
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
    }

  }
  catch (error) {
    console.error('There was an error!', error); // Handle the error as needed 
    return false
  }
}
*/

/*
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "What is the weather like in Boston?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_current_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"]
            }
          },
          "required": ["location"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
*/
