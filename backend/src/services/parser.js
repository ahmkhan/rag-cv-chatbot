// parser.js — Step 4b: read a PDF and split its text into overlapping chunks.
//
// Why chunks? An embedding captures the meaning of ONE piece of text. If we embedded
// the whole CV as one vector, a question about "AWS Lambda" would have to match the
// meaning of the entire CV. Smaller chunks let search find the exact section that answers.
//
// Why overlap? If a sentence is cut at a chunk border, the overlap repeats the end of the
// previous chunk at the start of the next one, so no idea is lost between two chunks.

const { readFile } = require('node:fs/promises');
const { PDFParse } = require('pdf-parse'); // pdf-parse v2 API (v1 used pdf(buffer) instead)

// Chunk size is counted in WORDS (simpler than tokens; 1 token ≈ 0.75 English words).
// The CV is short (~550 words), so we use small chunks (~160 tokens) to get ~5-6 focused
// pieces (contact, summary, each job, skills). Long documents would use bigger chunks
// (~500 tokens), but here big chunks would make every search return half the CV.
const CHUNK_SIZE_WORDS = 120;
const OVERLAP_WORDS = 20;

/**
 * Read a PDF file and return its plain text.
 * @param {string} filePath - path to the PDF
 * @returns {Promise<string>} the extracted text
 */
async function loadPdfText(filePath) {
  const buffer = await readFile(filePath); // read the PDF bytes from disk
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText(); // extract text from every page
    return result.text;
  } finally {
    await parser.destroy(); // free memory used by the PDF engine, even if getText failed
  }
}

/**
 * Remove noise that is not part of the CV content, so the chatbot never quotes it.
 * @param {string} text - raw text from the PDF
 * @returns {string} cleaned text
 */
function cleanText(text) {
  return text
    // Page markers added by pdf-parse, e.g. "-- 2 of 2 --"
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, ' ')
    // Browser print footers: a local file:/// link followed by a page count like "2/2"
    .replace(/file:\/\/\/\S+(\s+\d+\/\d+)?/g, ' ')
    // Browser print header: the page title line "Mohammed Ahmer Khan — Resume"
    .replace(/Mohammed Ahmer Khan\s+—\s+Resume/g, ' ')
    // Browser print date stamp, e.g. "2/20/26, 12:11 AM"
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*[AP]M/g, ' ');
}

/**
 * Split text into overlapping chunks of roughly CHUNK_SIZE_WORDS words.
 * @param {string} text - the full text
 * @returns {{ id: string, text: string }[]} chunks with stable ids (chunk-0, chunk-1, ...)
 */
function chunkText(text) {
  // Clean the noise first, then normalise whitespace: PDFs often contain line breaks
  // and double spaces mid-sentence.
  const words = cleanText(text).replace(/\s+/g, ' ').trim().split(' ');

  const chunks = [];
  const step = CHUNK_SIZE_WORDS - OVERLAP_WORDS; // how far the window moves each time

  for (let start = 0; start < words.length; start += step) {
    const chunkWords = words.slice(start, start + CHUNK_SIZE_WORDS);
    chunks.push({ id: `chunk-${chunks.length}`, text: chunkWords.join(' ') });

    // Stop once this chunk reached the end of the text.
    if (start + CHUNK_SIZE_WORDS >= words.length) break;
  }

  // If the last chunk adds only a few NEW words (most of it is overlap), it is almost a
  // duplicate of the previous chunk. Merge its new words into the previous chunk instead.
  const MIN_NEW_WORDS = 30;
  if (chunks.length > 1) {
    const lastWords = chunks[chunks.length - 1].text.split(' ');
    const newWords = lastWords.slice(OVERLAP_WORDS); // words not already in the previous chunk
    if (newWords.length < MIN_NEW_WORDS) {
      chunks.pop();
      chunks[chunks.length - 1].text += ' ' + newWords.join(' ');
    }
  }

  return chunks;
}

module.exports = { loadPdfText, cleanText, chunkText };
