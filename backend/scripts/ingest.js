// ingest.js — the full INGEST pipeline: PDF → text → chunks → vectors → Pinecone.
// Run from the backend folder whenever the CV changes:  node scripts/ingest.js

const path = require('node:path');
const { loadPdfText, chunkText } = require('../src/services/parser');
const { embedDocuments } = require('../src/services/embeddings');
const { clearNamespace, upsertChunks, countVectors } = require('../src/services/pinecone');

async function main() {
  const pdfPath = path.join(__dirname, '..', 'data', 'Ahmer-Khan-CV.pdf');

  console.log('1/4 Reading PDF...');
  const text = await loadPdfText(pdfPath);

  console.log('2/4 Splitting into chunks...');
  const chunks = chunkText(text);
  console.log(`    ${chunks.length} chunks`);

  console.log('3/4 Embedding chunks with Gemini...');
  const vectors = await embedDocuments(chunks.map((c) => c.text));

  console.log('4/4 Saving to Pinecone (old CV vectors are removed first)...');
  await clearNamespace();
  await upsertChunks(chunks, vectors);

  // Pinecone needs a few seconds to index new data before stats/search see it.
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Done. Vectors stored in namespace "cv": ${await countVectors()}`);
}

main().catch((error) => console.error('Ingest failed:', error.message));
