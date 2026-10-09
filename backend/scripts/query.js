// query.js — the SEARCH half of RAG: question → vector → Pinecone → best matching chunks.
// Run from the backend folder:  node scripts/query.js "your question here"

const { embedQuery } = require('../src/services/embeddings');
const { queryChunks } = require('../src/services/pinecone');

async function main() {
  const question = process.argv[2] || 'Which AWS services has he worked with?';
  console.log(`Question: "${question}"\n`);

  const questionVector = await embedQuery(question);
  const matches = await queryChunks(questionVector, 3);

  for (const match of matches) {
    console.log(`${match.score.toFixed(3)}  ${match.id}`);
    console.log(`       ${match.text.slice(0, 160)}...\n`);
  }
}

main().catch((error) => console.error('Query failed:', error.message));
