# AGENTS.md — RAG CV Chatbot

## Backend Agent
- Entry point: `backend/app.js`
- RAG logic in `backend/src/services/` — do not mix business logic into routes
- Embedding calls go through `services/embeddings.js` only
- Pinecone calls go through `services/pinecone.js` only
- PreToolUse hook active: will block commits if `.env` is staged

## Frontend Agent
- Angular 18 standalone components
- Dark theme SCSS — matches portfolio design system
- Chat UI in `src/app/components/chat/`

## Content Agent
- CV file: `backend/public/Ahmer-Khan-CV.pdf`
- Chunking config in `services/parser.js`
