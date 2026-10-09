// test-embeddings.js — embed the CV chunks and a question, then see which chunk is closest.
// This is a preview of what Pinecone will do for us in the next step.
// Run from the backend folder:  node scripts/test-embeddings.js

const path = require('node:path');
const { loadPdfText, chunkText } = require('../src/services/parser');
const { embedDocuments, embedQuery } = require('../src/services/embeddings');

// Cosine similarity: 1 = same direction (same meaning), 0 = unrelated.
// Pinecone computes exactly this when the index metric is "cosine".
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const text = await loadPdfText(path.join(__dirname, '..', 'data', 'Ahmer-Khan-CV.pdf'));
  const chunks = chunkText(text);

  const chunkVectors = await embedDocuments(chunks.map((c) => c.text));
  console.log(`Embedded ${chunkVectors.length} chunks, ${chunkVectors[0].length} numbers each`);

  const question = 'Which AWS services has he worked with?';
  const questionVector = await embedQuery(question);
  console.log(`\nQuestion: "${question}"\n`);

  // Score every chunk against the question, best first.
  const ranked = chunks
    .map((chunk, i) => ({ id: chunk.id, score: cosineSimilarity(questionVector, chunkVectors[i]), preview: chunk.text.slice(0, 80) }))
    .sort((a, b) => b.score - a.score);

  for (const r of ranked) {
    console.log(`${r.score.toFixed(3)}  ${r.id}  ${r.preview}...`);
  }
}

main().catch((error) => console.error('Embeddings test failed:', error.message));
