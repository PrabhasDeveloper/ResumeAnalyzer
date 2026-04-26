# ResumeAnalyzer

AI-powered Resume Analyzer with a Node.js backend and a vanilla HTML/CSS/JS frontend.

## Features

- User authentication (register/login)
- Resume PDF upload and text extraction
- AI-powered resume-to-job match scoring
- Skill extraction and missing-skill detection
- AI suggestions and improved resume bullet points
- Analysis history dashboard

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI: OpenAI chat + embeddings
- Storage: NeDB (file-based)

## Project Structure

- Frontend pages are at the project root
- Backend code is in the backend folder

## Run Locally

1. Go to backend folder
2. Install dependencies: `npm install`
3. Create `.env` from `.env.example`
4. Start backend: `npm run dev`
5. Open `index.html` in browser

## Security

- Do not commit real API keys
- Keep `.env` files local
- Use `.env.example` for sample values
