import { App, SocketModeReceiver } from "@slack/bolt";
import openai from "openai";
console.clear();

const ai = new openai({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
let cacheThreads: any = {};
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
  console.debug("#message0");
  //@ts-expect-error
  if (par.ack) par.ack();
  if (par.event.subtype) return;

  if (par.event.bot_profile) return;
  if (!["C07STMAUMTK"].includes(par.event.channel)) return;

  //@ts-ignore
  const content = par.event.text;
  if (!content) return;
  // no config for below
  if (content.startsWith("//") || content.includes("WORD_TO_NOT_RUN_AI")) {
    return;
  }
  let messages: any = [];
  console.debug(`#message1`);
  par.client.chat
    .postMessage({
      channel: par.event.channel,
      thread_ts: par.event.ts,
      text: ":spin-loading: Loading...",
    })
    .then(async (response) => {
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
      //@ts-expect-error
      if (par.event.thread_ts) {
        await par.client.conversations
          .replies({
            channel: par.event.channel,
            //@ts-expect-error
            ts: par.event.thread_ts,
          })
          .then((e) => {
            if (e.messages) {
              e.messages = e.messages.filter((m) => !m.text?.startsWith("//"));
              for (const message of e.messages) {
                if (
                  message.text?.startsWith("//") ||
                  message.text?.includes("WORD_TO_NOT_RUN_AI")
                )
                  continue;
                messages.push({
                  role: message.bot_id ? "assistant" : "user",
                  content: message.text,
                });
              }
            }
          });
      }
      //@ts-ignore
      if (par.event.thread_ts && cacheThreads[par.event.thread_ts]) {
        //@ts-ignore
        const thread = cacheThreads[par.event.thread_ts];
        await ai.beta.threads.messages.create(thread, {
          role: "user",
          content,
        });

        let run = await ai.beta.threads.runs.createAndPoll(thread, {
          assistant_id: aiID,
        });
        if (run.status === "completed") {
          const messages = await ai.beta.threads.messages.list(run.thread_id);
          //        m

          await par.client.chat.update({
            //@ts-expect-error
            ts: response.ts,
            thread_ts: par.event.ts,
            channel: par.event.channel,
            text:
              //@ts-expect-error
              messages.data.reverse()[0].content[0]?.text.value ||
              ":x: Error Null value",
          });
        }
      } else {
        // create a thread.
        //restore messages in thread because the cache is ONLY memory.
        const thread = await ai.beta.threads.create({
          messages,
        });

        cacheThreads[par.event.ts] = thread.id;
        await ai.beta.threads.messages.create(thread.id, {
          role: "user",
          content,
        });

        let run = await ai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: aiID,
        });
        if (run.status === "completed") {
          const messages = await ai.beta.threads.messages.list(run.thread_id);
          await par.client.chat.update({
            //@ts-expect-error
            ts: response.ts,
            thread_ts: par.event.ts,
            channel: par.event.channel,
            text:
              //@ts-expect-error
              messages.data.reverse()[0].content[0]?.text.value ||
              ":x: Error Null value",
          });
        }
      }
    });
});

console.log(`Starting on port ${process.env.PORT || 3000}`);
//@ts-ignore
await app.start({ port: process.env.PORT || 3000 });
app.client.chat.postMessage({
  channel: "C07LGLUTNH2",
  text: "Im up and running.",
});
console.log("⚡️ Bolt app started");
function errorHandle(e: any) {
  console.error(e);
  app.client.chat.postMessage({
    channel: "C07LGLUTNH2",
    text: "```\n" + e.stack + "\n```",
  });
}
process.on("uncaughtException", errorHandle);
process.on("unhandledRejection", errorHandle);
