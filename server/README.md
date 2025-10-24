# Chatbot Server

Simple Express + Mongoose backend for the Chatbot demo.

How to run:

1. cd server
2. npm install
3. npm run dev

The server exposes:

- POST /api/gemini -> forwards prompt to Google Generative Language API using server-side key
- GET /api/messages -> list stored messages
- POST /api/messages -> store a message

Make sure to set `.env` in the project root with `MONGO_URI` and `VITE_GEMINI_API_KEY`.
