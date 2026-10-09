// test-parser.js — check that the CV is read and split into sensible chunks.
// Run from the backend folder:  node scripts/test-parser.js

const path = require('node:path');
const { loadPdfText, chunkText } = require('../src/services/parser');

async function main() {
  const pdfPath = path.join(__dirname, '..', 'data', 'Ahmer-Khan-CV.pdf');

  const text = await loadPdfText(pdfPath);
  console.log('Characters extracted:', text.length);
  console.log('Words:', text.split(/\s+/).filter(Boolean).length);

  const chunks = chunkText(text);
  console.log('Chunks created:', chunks.length);

  // Show the start and end of each chunk so we can see the overlap working.
  for (const chunk of chunks) {
    const words = chunk.text.split(' ');
    console.log(`\n[${chunk.id}] ${words.length} words`);
    console.log('  starts:', words.slice(0, 12).join(' '), '...');
    console.log('  ends:  ...', words.slice(-12).join(' '));
  }
}

main().catch((error) => console.error('Parser test failed:', error.message));
