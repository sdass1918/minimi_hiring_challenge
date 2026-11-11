const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

if (!process.env.NVIDIA_API_KEY) {
  throw new Error("NVIDIA_API_KEY is missing from .env");
}

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const MODEL =
  process.env.NVIDIA_MODEL ||
  "mistralai/mistral-large-4-1t-a52b";

async function createCompletion({
  messages,
  tools,
  toolChoice = "auto",
}) {
  const response = await nvidia.chat.completions.create({
    model: MODEL,
    messages,
    ...(tools?.length ? { tools } : {}),
    tool_choice: tools?.length ? toolChoice : undefined,

    temperature: 0.5,
    top_p: 1,
    max_tokens: 8192,

    // Mistral Large 4 reasoning configuration.
    reasoning_effort: "high",
  });

  return response;
}

module.exports = {
    nvidia,
    MODEL,
    createCompletion
}
