// help idk how to use assistns
// @see https://platform.openai.com/docs/assistants/quickstart?context=without-streaming
import openai from "openai";
const ai = new openai({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
const aiID = await ai.beta.assistants.list().then((e) => e.data[0].id);
const thread = await ai.beta.threads.create();
const message = await ai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: " Where can I showcase my projects?"
    }
);

let run = await ai.beta.threads.runs.createAndPoll(
    thread.id,
    { 
      assistant_id: aiID,
    //   instructions: "Please address the user as Jane Doe. The user has a premium account."
    }
);
if (run.status === 'completed') {
    const messages = await ai.beta.threads.messages.list(
      run.thread_id
    );
    for (const message of messages.data.reverse()) {
        //@ts-ignore
      console.log(`${message.role} > ${message.content[0].text.value}`);
    }
  } else {
    console.log(run.status);
  }