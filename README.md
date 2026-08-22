# NexusTerminal

**NexusTerminal** is a modern, real-time market analytics and portfolio tracking dashboard with an integrated AI Copilot. Built with a containerized microservices architecture using Node.js, Python (FastAPI), React, MongoDB, and Redis.

This project is designed as a personal tracking tool to monitor global equities and cryptocurrencies, calculate dynamic portfolio health and P&L, and interact with an AI assistant for real-time portfolio insights.

## ✨ Key Features

- **Real-Time Data Streaming:** Uses WebSockets (Socket.IO) and the `yahoo-finance2` API to stream live market prices with zero HTTP polling overhead for sub-second data synchronization.
- **AI Portfolio Copilot:** Integrated LLM via a Python FastAPI microservice to provide intelligent, natural language insights and analysis on your portfolio.
- **Dynamic Portfolio Analytics:** Automatically calculates VWAP (Volume-Weighted Average Price), 24h P&L, and scores portfolio health based on diversification and risk concentration.
- **High-Performance Caching:** Utilizes an in-memory **Redis** cache to manage third-party API rate limits, reducing response latency to ~1ms.
- **Asynchronous Background Workers:** Dedicated Node.js background workers independently evaluate real-time user price alerts without blocking the main event loop.
- **Premium Glassmorphism UI:** Built with React, Tailwind CSS, and Recharts, featuring interactive area/donut charts, debounced global search, and slide-over asset drawers.

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Socket.IO Client
- **Core Backend:** Node.js, Express, TypeScript, Socket.IO
- **AI Microservice:** Python, FastAPI, Google Gemini LLM
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
   Create a `.env` file in the root directory containing your API keys:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

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
