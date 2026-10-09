// chatController.js — Step 5b: handles POST /api/chat.
// The controller's job: validate the request, call the RAG service, shape the response.
// The RAG logic itself stays in src/services/answer.js.

const { answerQuestion, MAX_QUESTION_LENGTH } = require('../services/answer');

async function chat(req, res) {
  const startedAt = Date.now();
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';

  // Validate input before spending any money on Gemini or Pinecone calls.
  if (!question) {
    return res.status(400).json({ error: 'Please type a question.' });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({ error: `Please keep questions under ${MAX_QUESTION_LENGTH} characters.` });
  }

  try {
    const result = await answerQuestion(question);

    // One structured log line per request. We log the question LENGTH, not its text,
    // so visitors' messages are not stored in our logs (privacy habit for Greetova).
    console.log(JSON.stringify({
      event: 'chat_answered',
      questionLength: question.length,
      model: result.model,
      durationMs: Date.now() - startedAt,
    }));

    return res.json({ answer: result.answer });
  } catch (error) {
    // Log the real error for us, but never send internal details to the browser.
    console.error(JSON.stringify({ event: 'chat_failed', error: error.message, durationMs: Date.now() - startedAt }));
    return res.status(503).json({ error: 'The assistant is busy right now. Please try again in a minute.' });
  }
}

module.exports = { chat };
