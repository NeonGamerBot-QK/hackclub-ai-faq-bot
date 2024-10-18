import openai from "openai";
const ai = new openai({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });
  