// embeddings.js — Step 4c: turn text into vectors with Gemini.
//
// Key idea: DOCUMENTS and QUESTIONS are embedded slightly differently.
// A question ("Does he know AWS?") and the CV text that answers it ("Lambda, S3, API
// Gateway...") are worded very differently. Telling Gemini which one it is embedding
// (taskType) makes their vectors land closer together, so search finds better matches.
//   - RETRIEVAL_DOCUMENT → for the CV chunks we store in Pinecone
//   - RETRIEVAL_QUERY    → for the user's question at search time

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = 'gemini-embedding-001';
// Must match the Pinecone index (cv-chatbot, 768 dimensions). The model's default is 3072.
// Note: at 768 dims the vectors are not unit-length, but our index uses the cosine metric,
// which compares direction only, so no extra normalisation is needed.
const DIMENSIONS = 768;

/**
 * Embed several CV chunks in ONE request (faster and fewer API calls than one per chunk).
 * @param {string[]} texts - the chunk texts
 * @returns {Promise<number[][]>} one 768-number vector per text, in the same order
 */
async function embedDocuments(texts) {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: texts,
    config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: DIMENSIONS },
  });
  return response.embeddings.map((embedding) => embedding.values);
}

/**
 * Embed a single user question.
 * @param {string} question
 * @returns {Promise<number[]>} a 768-number vector
 */
async function embedQuery(question) {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: question,
    config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: DIMENSIONS },
  });
  return response.embeddings[0].values;
}

module.exports = { embedDocuments, embedQuery, DIMENSIONS };
