import openai from "openai";
import fs from "fs";
import path from "path";
const genInstructions = () => {
  const filesInData = fs.readdirSync(path.join(__dirname, "..", "data"));
  return filesInData
    .map((f) => {
      return fs.readFileSync(path.join(__dirname, "..", "data", f)).toString();
    })
    .filter((fd) => {
      //test for binary files ;-;
      return /\ufffd/.test(fd) == false;
    })
    .join("\n");
};
const ai = new openai({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
const currentAIs = await ai.beta.assistants.list().then((e) => e.data);
if (currentAIs.length > 0) {
  console.log(
    `Current AIs: ${currentAIs.map((e) => e.id).join(", ")} - Deleting first one`,
  );
  // delete the AI for storage :P
  await ai.beta.assistants.del(currentAIs[0].id);
}

const assistant = await ai.beta.assistants.create({
  description: "An assistant that helps with hackclub info.",
  name: "Hackclub Info",
  model: "gpt-4o-mini",
  // @see https://platform.openai.com/docs/api-reference/assistants/createAssistant#assistants-createassistant-instructions
  instructions: genInstructions(),
});
console.log(`Created assistant: ${assistant.name} - (${assistant.id})`);