# RAG CV Chatbot

## About
A RAG (Retrieval-Augmented Generation) chatbot that answers questions about Ahmer Khan's CV using Gemini AI + Pinecone vector database.

## Owner
- **Name:** Mohammed Ahmer Khan
- **GitHub:** https://github.com/ahmkhan/rag-cv-chatbot

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Angular 18 standalone, SCSS |
| Backend | Node.js, Express.js |
| AI — Embeddings + Chat | Google Gemini (`gemini-embedding-001` at 768 dims + `gemini-3.6-flash`; 2.0 Flash was shut down 2026-06-01) via `@google/genai` |
| Vector DB | Pinecone Starter (free tier) |
| PDF Parsing | `pdf-parse` (npm) |

## Project Structure
```
backend/
├── app.js                     # Express entry point
├── src/
│   ├── routes/
│   │   └── chat.js            # POST /api/chat, POST /api/ingest
│   ├── controllers/
│   │   └── chatController.js  # RAG pipeline logic
│   └── services/
│       ├── embeddings.js      # Gemini embedding calls
│       ├── pinecone.js        # Pinecone upsert + query
│       └── parser.js          # PDF chunking logic
frontend/
├── angular.json
└── src/
    └── app/
        └── components/
            └── chat/          # Chat UI component
.env                           # API keys (gitignored)
```

## RAG Pipeline
1. **Ingest:** PDF → parse → chunk → embed (Gemini) → store (Pinecone)
2. **Query:** User question → embed → search Pinecone → top 3 chunks → Gemini → answer

## Deployment
- TBD (likely Render.com — same as AI Dev Assistant)

## Guidelines for AI Agents
- All RAG logic lives in `backend/src/services/`
- No external CSS frameworks — dark theme SCSS matching portfolio
- `.env` is gitignored — never commit API keys
- Chunk size: 120 words, overlap: 20 words (changed from 500 tokens because the CV is only ~550 words; long documents would use ~500 tokens)
- Pinecone: index `cv-chatbot`, namespace `cv`; `scripts/ingest.js` clears the namespace then re-uploads
- Embeddings use taskType RETRIEVAL_DOCUMENT for chunks and RETRIEVAL_QUERY for questions
- Workflow: Ahmer does setup (installs, keys, files); Claude writes code with explanatory comments; Ahmer reviews
- PreToolUse hook blocks any Bash command that tries to commit `.env`
