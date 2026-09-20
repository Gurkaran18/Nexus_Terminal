# NexusTerminal

**NexusTerminal** is a modern, real-time market analytics and portfolio tracking dashboard with an integrated AI Copilot. Built with a containerized microservices architecture using Node.js, Python (FastAPI), React, MongoDB, and Redis.

This project is designed as a personal tracking tool to monitor global equities and cryptocurrencies, calculate dynamic portfolio health and P&L, and interact with an AI assistant for real-time portfolio insights.

## ✨ Key Features

- **Real-Time Data Streaming:** Uses WebSockets (Socket.IO) and the `yahoo-finance2` API to stream live market prices: the server makes one batched Yahoo Finance call every 10 seconds and pushes it to all clients via Socket.IO.
- **AI Portfolio Copilot:** Integrated LLM (Google Gemini, `gemini-2.5-flash` by default) via a Python FastAPI microservice to provide intelligent, natural language insights and analysis on your portfolio. The LLM runs in its own container so the live price stream never waits on it.
- **Dynamic Portfolio Analytics:** Automatically calculates quantity-weighted average cost, 24h P&L, and scores portfolio health based on diversification and risk concentration.
- **High-Performance Caching:** Utilizes an in-memory **Redis** cache to manage third-party API rate limits.
- **Asynchronous Background Workers:** A dedicated Node.js worker evaluates user price alerts every minute against live Yahoo Finance prices (one batched quote call per run) and publishes triggered alerts over Redis Pub/Sub, which the backend relays to the browser over WebSockets.
- **Premium Glassmorphism UI:** Built with React, Tailwind CSS, and Recharts, featuring interactive area/donut charts, debounced global search, and slide-over asset drawers.

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Socket.IO Client
- **Core Backend:** Node.js, Express, TypeScript, Socket.IO
- **AI Microservice:** Python, FastAPI, Google Gemini LLM (`gemini-2.5-flash`)
- **Database & Caching:** MongoDB (Mongoose), Redis
- **Infrastructure:** Docker, Docker Compose
- **Data Provider:** Yahoo Finance API (`yahoo-finance2`)

## 🚀 Getting Started

The recommended way to run this project is using Docker, which automatically orchestrates the frontend, backend, AI service, background workers, MongoDB, and Redis containers.

### Prerequisites
- Docker and Docker Compose
- A Google Gemini API Key

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Gurkaran18/Nexus_Terminal.git
   cd Nexus_Terminal
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` in the root directory and fill in your API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   ```

   | Variable | Required | Default | Description |
   | --- | --- | --- | --- |
   | `GEMINI_API_KEY` | Yes | — | Google Gemini API key used by the AI service. |
   | `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model the AI service calls. Override it to switch models without a code change. |

3. **Start the Application:**
   ```bash
   docker-compose up --build
   ```
   
   Once all containers are running, the services will be available at:
   - **Frontend UI:** `http://localhost:5173`
   - **Backend API:** `http://localhost:5001`
   - **AI Service:** `http://localhost:8000`

*(If you prefer to run services manually without Docker, you will need to start MongoDB and Redis locally, then install dependencies and start the dev servers inside `/frontend`, `/backend`, and `/ai-service` individually.)*

## 📁 Repository Structure

- `/frontend` - The React Vite SPA application.
- `/backend` - The Node.js Express REST and WebSocket server.
- `/ai-service` - The Python FastAPI microservice handling LLM interactions.
- `/alert-worker` - Dedicated background process for evaluating price alerts.

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
