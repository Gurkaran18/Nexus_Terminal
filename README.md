# NexusTerminal

![NexusTerminal Overview](https://via.placeholder.com/1200x600.png?text=NexusTerminal+-+Market+Analytics+%26+Portfolio+Dashboard)

**NexusTerminal** is a modern, real-time market analytics and portfolio tracking dashboard built with the MERN stack (MongoDB, Express, React, Node.js) and TypeScript.

This project is designed as a personal tracking tool to monitor global equities (US & India) and cryptocurrencies, calculate dynamic portfolio health and P&L, and receive real-time price updates via WebSockets.

## ✨ Key Features

- **Real-Time Data Streaming:** Uses Socket.IO and the `yahoo-finance2` API to stream live market prices with zero HTTP polling overhead.
- **Dynamic Portfolio Analytics:** Automatically calculates VWAP (Volume-Weighted Average Price), 24h P&L, and scores portfolio health based on diversification and risk concentration.
- **In-Memory Caching:** Implements the Cache-Aside pattern via `node-cache` to eliminate third-party API rate limiting and drop response latency to ~1ms.
- **Background Workers:** Uses `node-cron` on a non-blocking event loop to evaluate price alerts asynchronously.
- **Advanced Data Visualization:** Interactive Area and Donut charts built with Recharts.
- **Premium Glassmorphism UI:** Built with Tailwind CSS, featuring debounced global search, slide-over asset drawers, and inline CRUD table operations.

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Socket.IO Client
- **Backend:** Node.js, Express 5, TypeScript, Socket.IO
- **Database:** MongoDB, Mongoose
- **Services:** `node-cache` (TTL caching), `node-cron` (background jobs)
- **Data Provider:** Yahoo Finance API (`yahoo-finance2`)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/portfolio-db`)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/portfolio-dashboard.git
   cd portfolio-dashboard
   ```

2. **Start the Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The backend will start on `http://localhost:5001` and connect to MongoDB.*

3. **Start the Frontend:**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The frontend will start on `http://localhost:5173`.*

## 📁 Repository Structure

- `/frontend` - The React Vite SPA application.
- `/backend` - The Node.js Express REST and WebSocket server.

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
