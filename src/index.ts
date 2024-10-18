import dotenv from 'dotenv';
dotenv.config();
import { App, SocketModeReceiver } from "@slack/bolt";
import openai from "openai";
const ai = new openai({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });
  const getPrompt = ():string => {
    return `one sec`
  }
const app = new App({
    token: process.env.BOT_TOKEN,
    // socketMode: true,
    appToken: process.env.APP_TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
  });
  
  app.event('message', async (par) => {
    if(par.event.subtype) return;
    console.debug(`#message`, par.message)

if( par.event.bot_profile) return;
if(!["C07STMAUMTK"].includes(par.event.channel)) return;

//@ts-ignore
const content = par.event.text
let messages:any =[];
if(par.event.thread_ts) {
       await par.client.conversations.replies({
        channel: par.event.channel,
        ts: par.event.thread_ts,
    }).then(e=>{
        
    if(e.messages) {
        e.messages = e.messages.filter(m=>!m.text?.startsWith('//'))
        for(const message of e.messages) {
            messages.push({
                "role": message.bot_id ? "assistant" : "user",
                "content": message.text
            })
        }
    }
})
}

  par.client.chat.postMessage({
    channel: par.event.channel,
    thread_ts: par.event.ts,
    text: ":spin-loading: Loading...",
}).then(async (response) => {
// pretend to ai it.
// ...
const aiResponse = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        {
role: "system",
content: getPrompt()
        },
        ...messages, {
        role: "user",
        content: content
    }],
    stream: false
})
// const aiResponse = await fetch('http://localhost:11434/api/chat', {
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 model: "phi",
//                 messages: [...messages, {
//                     role: "user",
//                     content: content
//                 }],
//                 stream: false
//             })
// }).then(r=>r.json())

console.log()
await par.client.chat.update({
    //@ts-expect-error
    ts: response.ts,
    thread_ts: par.event.ts,
    channel: par.event.channel,
    text: aiResponse.choices[0].message.content || ":x: Error Null value",
})
})
})
    await app.start({ port: 3000 });
await app.client.chat.postMessage({
    channel: 'C07LGLUTNH2',
    text: "@neon im up and running."
})

    console.log('⚡️ Bolt app started');