import os
import json
import hashlib
import redis.asyncio as aioredis
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# App & Config
# ---------------------------------------------------------------------------
app = FastAPI(title="Portfolio AI Copilot", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = 300  # Cache AI responses for 5 minutes

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# ---------------------------------------------------------------------------
# Redis client (initialized at startup)
# ---------------------------------------------------------------------------
redis_client: Optional[aioredis.Redis] = None

@app.on_event("startup")
async def startup_event():
    global redis_client
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    print("✅ AI Service: Redis connected")
    print(f"✅ AI Service: Gemini configured (key ends in ...{GEMINI_API_KEY[-6:] if GEMINI_API_KEY else 'MISSING'})")

@app.on_event("shutdown")
async def shutdown_event():
    if redis_client:
        await redis_client.close()

# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------
class Holding(BaseModel):
    symbol: str
    name: str
    quantity: float
    avgPrice: float
    currentPrice: float
    totalValue: float
    gainLoss: float
    gainLossPct: float

class AnalyzeRequest(BaseModel):
    holdings: list[Holding]
    totalValue: float
    totalGainLoss: float
    totalGainLossPct: float

class AskRequest(BaseModel):
    question: str
    holdings: list[Holding]
    totalValue: float

class AIResponse(BaseModel):
    response: str
    cached: bool
    model: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def build_portfolio_context(holdings: list[Holding], total_value: float) -> str:
    """Convert portfolio data into a rich text context for the LLM."""
    lines = [f"Total Portfolio Value: ${total_value:,.2f}\n", "Holdings:"]
    for h in holdings:
        gain_str = f"+${h.gainLoss:,.2f} (+{h.gainLossPct:.2f}%)" if h.gainLoss >= 0 else f"-${abs(h.gainLoss):,.2f} ({h.gainLossPct:.2f}%)"
        lines.append(
            f"  - {h.name} ({h.symbol}): {h.quantity} shares @ ${h.currentPrice:.2f} | "
            f"Total: ${h.totalValue:,.2f} | P&L: {gain_str}"
        )
    return "\n".join(lines)

def cache_key(prefix: str, data: dict) -> str:
    payload = json.dumps(data, sort_keys=True)
    return f"ai:{prefix}:{hashlib.md5(payload.encode()).hexdigest()}"

async def get_cached(key: str) -> Optional[str]:
    if redis_client:
        return await redis_client.get(key)
    return None

async def set_cached(key: str, value: str):
    if redis_client:
        await redis_client.setex(key, CACHE_TTL, value)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health_check():
    redis_ok = False
    if redis_client:
        try:
            await redis_client.ping()
            redis_ok = True
        except Exception:
            pass
    return {
        "status": "ok",
        "service": "ai-copilot",
        "redis": "connected" if redis_ok else "disconnected",
        "gemini": "configured" if GEMINI_API_KEY else "missing_key"
    }

@app.post("/analyze", response_model=AIResponse)
async def analyze_portfolio(req: AnalyzeRequest):
    """Generate a comprehensive AI-powered portfolio analysis."""
    key = cache_key("analyze", req.dict())
    cached = await get_cached(key)
    if cached:
        return AIResponse(response=cached, cached=True, model="gemini-1.5-flash")

    context = build_portfolio_context(req.holdings, req.totalValue)
    gain_str = f"+{req.totalGainLossPct:.2f}%" if req.totalGainLoss >= 0 else f"{req.totalGainLossPct:.2f}%"

    prompt = f"""You are an expert portfolio analyst and financial advisor AI. 
Analyze the following investment portfolio and provide a concise, insightful summary.

{context}
Overall P&L: ${req.totalGainLoss:,.2f} ({gain_str})

Please provide:
1. **Portfolio Health Score** (0-100) with a brief explanation
2. **Top Performers & Laggards** — highlight the best and worst holdings
3. **Diversification Analysis** — assess risk concentration
4. **Key Insight** — one actionable observation the investor should know
5. **Risk Assessment** — brief 1-2 sentence risk summary

Keep the response concise, data-driven, and use markdown formatting. Do not give specific buy/sell advice."""

    try:
        result = model.generate_content(prompt)
        response_text = result.text
        await set_cached(key, response_text)
        return AIResponse(response=response_text, cached=False, model="gemini-1.5-flash")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

@app.post("/ask", response_model=AIResponse)
async def ask_question(req: AskRequest):
    """Answer a natural language question about the portfolio."""
    key = cache_key("ask", req.dict())
    cached = await get_cached(key)
    if cached:
        return AIResponse(response=cached, cached=True, model="gemini-1.5-flash")

    context = build_portfolio_context(req.holdings, req.totalValue)

    prompt = f"""You are an expert portfolio analyst AI. Answer the following question about this investment portfolio.

Portfolio Context:
{context}

User Question: {req.question}

Instructions:
- Be concise and direct (2-4 sentences max unless a detailed breakdown is needed)
- Use specific numbers from the portfolio data
- Use markdown formatting where helpful
- Do not give specific buy/sell advice, only factual analysis"""

    try:
        result = model.generate_content(prompt)
        response_text = result.text
        await set_cached(key, response_text)
        return AIResponse(response=response_text, cached=False, model="gemini-1.5-flash")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
