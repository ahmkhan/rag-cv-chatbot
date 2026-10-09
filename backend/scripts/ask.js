// ask.js — try the full RAG chatbot from the terminal (no server needed).
// Run from the backend folder:  node scripts/ask.js "your question"

const { answerQuestion } = require('../src/services/answer');

async function main() {
  const question = process.argv[2] || 'What is his experience with Angular?';
  const result = await answerQuestion(question);

  console.log(`Q: ${question}`);
  console.log(`A: ${result.answer}`);
  console.log(`   (model: ${result.model}, sources: ${result.sources.map((s) => `${s.id} ${s.score}`).join(', ')})`);
}

main().catch((error) => console.error('Ask failed:', error.message));
