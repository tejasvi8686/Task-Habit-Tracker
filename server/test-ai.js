import axios from "axios";

async function testAI() {

  const response = await axios.post(
    "http://localhost:11434/api/generate",
    {
      model: "gemma3:4b",
      prompt: "Explain Node.js in 2 lines",
      stream: false
    }
  );

  console.log(response.data.response);

}

testAI();
