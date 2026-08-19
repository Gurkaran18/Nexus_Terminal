# Portfolio Dashboard: System Architecture Upgrades

This document outlines the three major enterprise-grade architectural upgrades implemented in the Portfolio Dashboard application. These upgrades transitioned the application from a simple monolithic prototype into a scalable, distributed, and containerized system.

---

## 1. Migration to a Distributed Cache (Redis)

### What We Did
We removed the local memory caching solution (`node-cache`) and replaced it with **Redis**, an industry-standard, high-performance distributed caching database. 

### How We Did It (Tools & Methods)
- **Tools:** Node.js, `redis` npm package, Docker (Redis Image).
- **Implementation:** 
  - We uninstalled `node-cache` which traps cached data in the local RAM of a single Node.js process.
  - We initialized a centralized Redis client connection (`redisClient.ts`) on server startup.
  - In our market API endpoints (e.g., `GET /api/market/quote/:symbol`), we replaced synchronous local cache lookups with asynchronous network calls to the Redis store (`await redisClient.get()`).
  - If a cache miss occurs, the backend fetches from the external API (Yahoo Finance), serves the user, and uses `await redisClient.setEx()` to store the fresh data in Redis with an expiration time.

### The Impact (Positives)
- **Horizontal Scalability:** Local caching fails when you run multiple instances of your Node.js server (e.g., behind a load balancer), as each server has a separate, out-of-sync cache. A centralized Redis cluster ensures **data consistency** across an infinite number of backend servers.
- **Resilience & Decoupling:** The cache now survives backend server restarts. If the API server crashes and restarts, the cache remains hot because it lives in a completely separate database process.

*Interview Flex:* "I realized local memory caching wouldn't scale horizontally, so I migrated the caching layer to a centralized Redis cluster to ensure data consistency across multiple server instances."

---

## 2. Infrastructure as Code (Docker & Docker Compose)

### What We Did
We containerized the entire full-stack application. Instead of manually installing Node.js, MongoDB, and Redis on a host machine and running them in separate terminal windows, we automated the entire infrastructure setup.

### How We Did It (Tools & Methods)
- **Tools:** Docker, Docker Compose, Docker Volumes (for local hot-reloading).
- **Implementation:**
  - We created highly optimized **Dockerfiles** for both the frontend (React/Vite) and backend (Express). We used lightweight `node:alpine` base images.
  - We authored a `docker-compose.yml` file to orchestrate a private virtual network. It defines 4 distinct services: `mongodb`, `redis`, `backend`, and `frontend`.
  - We established strict startup dependencies (`depends_on`) so the frontend waits for the backend, and the backend waits for the databases.
  - We implemented a Development configuration (`docker-compose.override.yml`) using **Volume Bind Mounts**. This creates a live tunnel between the host machine and the containers, enabling instant hot-reloading during development without needing to rebuild images.

### The Impact (Positives)
- **"It Works on My Machine" Eliminated:** By bundling the OS, runtime, and dependencies into isolated containers, the application is guaranteed to run identically on any developer's laptop, staging server, or production cloud environment.
- **One-Command Deployment:** A massive reduction in setup friction. A new developer can clone the repository and run `docker compose up` to instantly boot the entire database, cache, backend, and frontend ecosystem.
- **Isolated Networking:** The database and cache are securely hidden inside the Docker network. The backend communicates with them internally, reducing security vulnerabilities.

*Interview Flex:* "I implemented Infrastructure as Code using Docker Compose to containerize the frontend, backend, database, and caching layer into a unified, isolated virtual network, ensuring parity between development and production environments."

---

## 3. Extracting the Cron Job into a Microservice (Redis Pub/Sub)

### What We Did
We decoupled the background price-alert evaluation engine from the main backend API server, extracting it into a completely standalone Node.js Microservice.

### How We Did It (Tools & Methods)
- **Tools:** Node.js, `node-cron`, Redis Pub/Sub, Socket.IO.
- **Implementation:**
  - **The Extraction:** We ripped the `alertWorker.ts` logic out of the main backend and created a separate application directory (`/alert-worker`) with its own `package.json` and `Dockerfile`.
  - **The Publisher (Worker):** The new worker continuously scans MongoDB for active alerts. When a target price is hit, it acts as a Publisher, broadcasting a JSON payload to a Redis channel called `PRICE_ALERTS`.
  - **The Subscriber (Backend API):** The main API server establishes a secondary Redis connection dedicated to subscribing. It listens to the `PRICE_ALERTS` channel.
  - **The WebSocket Bridge:** When the API server hears the Redis message, it instantly relays it to the frontend UI via a Socket.IO WebSocket (`io.emit("priceAlert")`), triggering a live Toast notification on the user's screen.

### The Impact (Positives)
- **Eliminating Thread-Blocking:** Node.js is single-threaded. If the background worker was processing a loop of 100,000 alerts, it would completely freeze the main thread, meaning live users couldn't fetch API data. By extracting it, the main API remains 100% dedicated to lightning-fast user responses.
- **Independent Scaling:** If the background workload increases drastically, we can deploy 5 instances of the Alert Worker without needing to scale the API servers. This targeted resource allocation is highly cost-effective.
- **Fault Tolerance:** If a bug causes the background worker to crash, the main application (the frontend and the API) stays perfectly healthy and online.

*Interview Flex:* "I identified a potential thread-blocking bottleneck with the background cron workers, so I decoupled the alert evaluation engine into a standalone microservice, implementing real-time cross-service communication via Redis Pub/Sub."
