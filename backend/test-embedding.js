// Step 3: test that Gemini can turn text into an embedding (a vector of numbers).

// 1. Load GEMINI_API_KEY from the .env file into process.env
require('dotenv').config();

// 2. Import the Gemini client from Google's current SDK
const { GoogleGenAI } = require('@google/genai');

// Create the client with our API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    // 3. Ask Gemini to embed one sentence.
    //    outputDimensionality: 768 must match our Pinecone index (cv-chatbot, 768 dims).
    //    Without it, gemini-embedding-001 returns 3072 numbers and Pinecone would reject them.
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'Senior MEAN Stack Developer with 7 years of Angular',
      config: { outputDimensionality: 768 },
    });

    // 4. The vector is in response.embeddings[0].values
    const vector = response.embeddings[0].values;

    console.log('Vector length:', vector.length); // expect 768
    console.log('First 5 numbers:', vector.slice(0, 5));
  } catch (error) {
    console.error('Embedding failed:', error.message);
  }
}

main();
