import dotenv from "dotenv";
dotenv.config();
import { App, SocketModeReceiver } from "@slack/bolt";
import openai from "openai";
const ai = new openai({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
const app = new App({
  token: process.env.BOT_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
});
const aiID = await ai.beta.assistants.list().then((e) => e.data[0].id);
if (!aiID) {
  console.error("No AI found.");
  process.exit(1);
}
app.event("message", async (par) => {
  if (par.event.subtype) return;
  console.debug(`#message`, par.message);

  if (par.event.bot_profile) return;
  if (!["C07STMAUMTK"].includes(par.event.channel)) return;

  //@ts-ignore
  const content = par.event.text;
  if (!content) return;
  let messages: any = [];
  if (par.event.thread_ts) {
    await par.client.conversations
      .replies({
        channel: par.event.channel,
        ts: par.event.thread_ts,
      })
      .then((e) => {
        if (e.messages) {
          e.messages = e.messages.filter((m) => !m.text?.startsWith("//"));
          for (const message of e.messages) {
            messages.push({
              role: message.bot_id ? "assistant" : "user",
              content: message.text,
            });
          }
        }
      });
  }

  par.client.chat
    .postMessage({
      channel: par.event.channel,
      thread_ts: par.event.ts,
      text: ":spin-loading: Loading...",
    })
    .then(async (response) => {
      // pretend to ai it.
      // ...
      const moderationOut = await ai.moderations
        .create({
          input: content,
        })
        .then((d) => d.results[0]);
      if (
        [...new Set(Object.values(moderationOut.categories))].includes(true)
      ) {
        // if it's harmful, don't send it to the AI
        await par.client.chat.update({
          //@ts-expect-error
          ts: response.ts,
          thread_ts: par.event.ts,
          channel: par.event.channel,
          text: `:x: Harmful content detected.\n>Follwing subjects:  ${Object.entries(
            moderationOut.categories,
          )
            .filter((e) => e[1])
            .map((e) => e[0])
            .join(", ")}`,
        });
        return;
      }
      //TODO: find a tutorial
      const aiResponse = null;
      // const aiResponse = await ai.chat.completions.create({
      //     model: "gpt-4o-mini",
      //     messages: [
      //         {
      // role: "system",
      // content: getPrompt()
      //         },
      //         ...messages, {
      //         role: "user",
      //         content: content
      //     }],
      //     stream: false
      // })
      console.log();
      await par.client.chat.update({
        //@ts-expect-error
        ts: response.ts,
        thread_ts: par.event.ts,
        channel: par.event.channel,
        // text: aiResponse.choices[0].message.content || ":x: Error Null value",
      });
    });
});
await app.start({ port: 3000 });
await app.client.chat.postMessage({
  channel: "C07LGLUTNH2",
  text: "Im up and running.",
});

console.log("⚡️ Bolt app started");
