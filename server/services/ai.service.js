import axios from "axios";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "gemma3:4b";

export const summarizeText = async (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input text");
  }

  try {
    const prompt = `
You are a helpful AI assistant.
Your task is to summarize the provided text into a JSON object.

Strictly return ONLY a JSON object with the following keys:
- "title": A short, catchy headline.
- "summary": A concise summary (2-3 sentences).
- "whyItMatters": A brief explanation of significance.

Example format:
{
  "title": "Example Title",
  "summary": "Example summary text.",
  "whyItMatters": "Example significance."
}

Do not include any markdown, explanations, or extra text outside the JSON.

Text to summarize:
${text}
`;

    const response = await axios.post(OLLAMA_URL, {
      model: MODEL,
      prompt: prompt,
      stream: false,
      format: "json", // Enforce JSON mode if supported by model/Ollama version
      options: {
        temperature: 0.7
      }
    });

    if (!response.data || !response.data.response) {
      throw new Error("Invalid response from Ollama");
    }

    let result;
    try {
      // Clean up potential markdown code blocks if the model adds them
      const cleanResponse = response.data.response.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("Cleaned AI Response:", cleanResponse); // Debug log
      result = JSON.parse(cleanResponse);
      console.log("Parsed AI Result:", result); // Debug log
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Response:", response.data.response);
      throw new Error("Failed to parse AI response");
    }

    // Validate structure
    if (!result.title || !result.summary || !result.whyItMatters) {
      console.error("Missing fields in AI response:", result);
      throw new Error("AI response missing required fields");
    }

    return result;

  } catch (error) {
    console.error("AI Service Error:", error.message);
    if (error.response) {
      console.error("Ollama Response Data:", error.response.data);
    }
    throw new Error(error.message || "AI processing failed");
  }
};
