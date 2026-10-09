// pinecone.js — Step 4d: store CV chunk vectors in Pinecone and search them.
//
// Pinecone is a vector database: it stores vectors (plus "metadata", any extra info we
// attach, like the chunk's original text) and finds the vectors closest to a query vector.
// Our index "cv-chatbot" was created with 768 dimensions and the cosine metric.

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const INDEX_NAME = 'cv-chatbot';
// A namespace is a separate "folder" inside the index. Keeping the CV in its own namespace
// means we can wipe and re-load it without touching anything else stored in the index.
const NAMESPACE = 'cv';

const index = pc.index({ name: INDEX_NAME, namespace: NAMESPACE });

/**
 * Delete every vector in our namespace, so re-running ingest never leaves old chunks behind.
 */
async function clearNamespace() {
  try {
    await index.deleteAll();
  } catch (error) {
    // The very first run has no namespace yet, and Pinecone answers "not found". That's fine.
    if (!/not ?found|404/i.test(error.message)) throw error;
  }
}

/**
 * Save chunks and their vectors. The chunk text goes into metadata so that search
 * results can give us back the actual words to send to Gemini later.
 * @param {{ id: string, text: string }[]} chunks
 * @param {number[][]} vectors - one vector per chunk, same order
 */
async function upsertChunks(chunks, vectors) {
  const records = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: vectors[i],
    metadata: { text: chunk.text, source: 'Ahmer-Khan-CV.pdf' },
  }));
  await index.upsert({ records }); // "upsert" = insert, or update if the id already exists
}

/**
 * Find the chunks closest in meaning to a question vector.
 * @param {number[]} questionVector - from embedQuery()
 * @param {number} topK - how many chunks to return
 * @returns {Promise<{ id: string, score: number, text: string }[]>} best match first
 */
async function queryChunks(questionVector, topK = 3) {
  const response = await index.query({
    vector: questionVector,
    topK,
    includeMetadata: true, // without this we'd only get ids and scores, not the text
  });
  return response.matches.map((match) => ({
    id: match.id,
    score: match.score,
    text: match.metadata.text,
  }));
}

/**
 * How many vectors are stored in our namespace (useful to confirm ingest worked).
 */
async function countVectors() {
  const stats = await index.describeIndexStats();
  return stats.namespaces?.[NAMESPACE]?.recordCount ?? 0;
}

module.exports = { clearNamespace, upsertChunks, queryChunks, countVectors };
