#!/usr/bin/env python3
"""
GPT-5 Service for AutoSOS
Intelligent AI diagnostic service with cost optimization
"""

import os
import time
import json
import hashlib
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import httpx
import redis
import structlog
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter('gpt5_requests_total', 'Total GPT-5 requests', ['model', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('gpt5_request_duration_seconds', 'GPT-5 request duration', ['model', 'endpoint'])
COST_TRACKER = Counter('gpt5_cost_total', 'Total GPT-5 cost in USD', ['model', 'endpoint'])

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Cost optimization settings
MAX_MONTHLY_COST = float(os.getenv("MAX_MONTHLY_COST", "200.0"))
COST_ALERT_THRESHOLD = float(os.getenv("COST_ALERT_THRESHOLD", "150.0"))
CACHE_DURATION = int(os.getenv("CACHE_DURATION", "3600"))  # 1 hour

# Initialize Redis for caching
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# HTTP client for API calls
http_client = httpx.AsyncClient(timeout=60.0)

# Pydantic models
class DiagnosticRequest(BaseModel):
    user_message: str
    yolo_detections: Optional[List[Dict[str, Any]]] = None
    user_tier: str = "free"  # free, premium, emergency
    emergency_level: str = "normal"  # normal, urgent, critical
    context: Optional[Dict[str, Any]] = None

class DiagnosticResponse(BaseModel):
    success: bool
    response: str
    model_used: str
    cost: float
    cached: bool
    processing_time: float
    recommendations: List[str]
    severity: str
    immediate_actions: List[str]

class CostMetrics(BaseModel):
    monthly_cost: float
    daily_cost: float
    requests_today: int
    average_cost_per_request: float
    cost_alert: bool

# Cost tracking
def track_cost(model: str, endpoint: str, cost: float):
    """Track API costs"""
    COST_TRACKER.labels(model=model, endpoint=endpoint).inc(cost)
    
    # Store in Redis for monthly tracking
    today = datetime.now().strftime("%Y-%m-%d")
    redis_client.hincrbyfloat(f"costs:{today}", f"{model}:{endpoint}", cost)
    redis_client.expire(f"costs:{today}", 86400 * 31)  # 31 days

def get_monthly_cost() -> float:
    """Get current month's total cost"""
    total_cost = 0.0
    current_month = datetime.now().strftime("%Y-%m")
    
    # Get all cost entries for current month
    keys = redis_client.keys(f"costs:{current_month}-*")
    for key in keys:
        costs = redis_client.hgetall(key)
        for cost_key, cost_value in costs.items():
            total_cost += float(cost_value)
    
    return total_cost

def should_use_gpt5(request: DiagnosticRequest) -> bool:
    """Determine if request should use GPT-5 or fallback to Ollama"""
    monthly_cost = get_monthly_cost()
    
    # Emergency situations always use GPT-5
    if request.emergency_level == "critical":
        return True
    
    # Premium users get GPT-5 access
    if request.user_tier == "premium":
        return True
    
    # Check cost limits
    if monthly_cost >= MAX_MONTHLY_COST:
        logger.warning("Monthly cost limit reached, using Ollama fallback")
        return False
    
    # Complex requests with YOLOv8 detections
    if request.yolo_detections and len(request.yolo_detections) > 0:
        return True
    
    # Check if request complexity warrants GPT-5
    complex_keywords = [
        "emergency", "urgent", "critical", "dangerous", "safety",
        "complex", "multiple", "advanced", "detailed", "comprehensive"
    ]
    
    if any(keyword in request.user_message.lower() for keyword in complex_keywords):
        return True
    
    return False

def generate_cache_key(request: DiagnosticRequest) -> str:
    """Generate cache key for request"""
    # Create hash of request content
    content = f"{request.user_message}:{json.dumps(request.yolo_detections or [])}:{request.user_tier}"
    return hashlib.md5(content.encode()).hexdigest()

def get_cached_response(cache_key: str) -> Optional[DiagnosticResponse]:
    """Get cached response if available"""
    try:
        cached_data = redis_client.get(f"gpt5_cache:{cache_key}")
        if cached_data:
            data = json.loads(cached_data)
            return DiagnosticResponse(**data)
    except Exception as e:
        logger.error(f"Error retrieving cached response: {e}")
    return None

def cache_response(cache_key: str, response: DiagnosticResponse, duration: int = CACHE_DURATION):
    """Cache response"""
    try:
        redis_client.setex(
            f"gpt5_cache:{cache_key}",
            duration,
            json.dumps(response.dict())
        )
    except Exception as e:
        logger.error(f"Error caching response: {e}")

async def call_gpt5(request: DiagnosticRequest) -> DiagnosticResponse:
    """Call GPT-5 API"""
    start_time = time.time()
    
    # Build enhanced prompt with YOLOv8 context
    prompt = build_diagnostic_prompt(request)
    
    try:
        response = await http_client.post(
            f"{OPENAI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-5",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert motorcycle mechanic and diagnostic specialist. Provide accurate, helpful, and safety-focused advice."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.7,
                "top_p": 0.9
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="GPT-5 API error")
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Estimate cost (rough calculation)
        cost = estimate_gpt5_cost(result["usage"])
        
        # Track cost
        track_cost("gpt-5", "diagnostic", cost)
        
        processing_time = time.time() - start_time
        
        return DiagnosticResponse(
            success=True,
            response=content,
            model_used="gpt-5",
            cost=cost,
            cached=False,
            processing_time=processing_time,
            recommendations=extract_recommendations(content),
            severity=determine_severity(request, content),
            immediate_actions=extract_immediate_actions(content)
        )
        
    except Exception as e:
        logger.error(f"GPT-5 API error: {e}")
        raise HTTPException(status_code=500, detail=f"GPT-5 service error: {str(e)}")

async def call_ollama_fallback(request: DiagnosticRequest) -> DiagnosticResponse:
    """Fallback to Ollama service"""
    start_time = time.time()
    
    try:
        response = await http_client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": request.user_message,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Ollama API error")
        
        result = response.json()
        content = result.get("response", "Unable to generate response")
        
        processing_time = time.time() - start_time
        
        return DiagnosticResponse(
            success=True,
            response=content,
            model_used="ollama-llama3.2",
            cost=0.0,  # Free
            cached=False,
            processing_time=processing_time,
            recommendations=extract_recommendations(content),
            severity="normal",
            immediate_actions=[]
        )
        
    except Exception as e:
        logger.error(f"Ollama fallback error: {e}")
        raise HTTPException(status_code=500, detail=f"Ollama service error: {str(e)}")

def build_diagnostic_prompt(request: DiagnosticRequest) -> str:
    """Build enhanced diagnostic prompt with YOLOv8 context"""
    prompt = f"""
    Motorcycle Diagnostic Request:
    
    User Description: {request.user_message}
    
    """
    
    if request.yolo_detections:
        prompt += f"""
    Visual Analysis (YOLOv8 Detection Results):
    """
        for i, detection in enumerate(request.yolo_detections, 1):
            prompt += f"""
    Detection {i}:
    - Issue: {detection.get('class_display_name', 'Unknown')}
    - Confidence: {detection.get('confidence', 0):.2f}
    - Severity: {detection.get('severity', 'Unknown')}
    - Location: {detection.get('bbox', 'Unknown')}
    """
    
    prompt += f"""
    
    Please provide:
    1. Issue identification and analysis
    2. Severity assessment (low/medium/high/critical)
    3. Immediate safety actions required
    4. Step-by-step repair recommendations
    5. Estimated repair time and difficulty
    6. Safety warnings and precautions
    
    Format your response clearly with numbered sections.
    """
    
    return prompt

def estimate_gpt5_cost(usage: Dict[str, Any]) -> float:
    """Estimate GPT-5 API cost"""
    # Rough estimation - adjust based on actual GPT-5 pricing
    prompt_tokens = usage.get("prompt_tokens", 0)
    completion_tokens = usage.get("completion_tokens", 0)
    
    # Estimated pricing (adjust when GPT-5 pricing is released)
    prompt_cost = prompt_tokens * 0.00001  # $0.01 per 1K tokens
    completion_cost = completion_tokens * 0.00003  # $0.03 per 1K tokens
    
    return prompt_cost + completion_cost

def extract_recommendations(content: str) -> List[str]:
    """Extract recommendations from response"""
    recommendations = []
    lines = content.split('\n')
    
    for line in lines:
        if any(keyword in line.lower() for keyword in ['recommend', 'suggest', 'should', 'need to']):
            recommendations.append(line.strip())
    
    return recommendations[:5]  # Limit to 5 recommendations

def determine_severity(request: DiagnosticRequest, content: str) -> str:
    """Determine severity level"""
    if request.emergency_level == "critical":
        return "critical"
    
    content_lower = content.lower()
    if any(word in content_lower for word in ['critical', 'dangerous', 'emergency', 'urgent']):
        return "high"
    elif any(word in content_lower for word in ['serious', 'important', 'attention']):
        return "medium"
    else:
        return "low"

def extract_immediate_actions(content: str) -> List[str]:
    """Extract immediate actions from response"""
    actions = []
    lines = content.split('\n')
    
    for line in lines:
        if any(keyword in line.lower() for keyword in ['immediately', 'urgent', 'stop', 'do not', 'avoid']):
            actions.append(line.strip())
    
    return actions[:3]  # Limit to 3 immediate actions

# FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("GPT-5 Service starting up")
    yield
    logger.info("GPT-5 Service shutting down")
    await http_client.aclose()

app = FastAPI(
    title="AutoSOS GPT-5 Service",
    description="Intelligent AI diagnostic service with cost optimization",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "gpt5-service",
        "timestamp": datetime.now().isoformat(),
        "monthly_cost": get_monthly_cost()
    }

@app.post("/api/diagnostic", response_model=DiagnosticResponse)
async def generate_diagnostic(request: DiagnosticRequest):
    """Generate diagnostic response using GPT-5 or Ollama fallback"""
    REQUEST_COUNT.labels(model="gpt5", endpoint="diagnostic", status="200").inc()
    
    # Check cache first
    cache_key = generate_cache_key(request)
    cached_response = get_cached_response(cache_key)
    if cached_response:
        cached_response.cached = True
        return cached_response
    
    # Determine which model to use
    use_gpt5 = should_use_gpt5(request)
    
    try:
        if use_gpt5:
            response = await call_gpt5(request)
        else:
            response = await call_ollama_fallback(request)
        
        # Cache the response
        cache_response(cache_key, response)
        
        return response
        
    except Exception as e:
        logger.error(f"Diagnostic generation error: {e}")
        REQUEST_COUNT.labels(model="gpt5", endpoint="diagnostic", status="500").inc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cost-metrics", response_model=CostMetrics)
async def get_cost_metrics():
    """Get current cost metrics"""
    monthly_cost = get_monthly_cost()
    daily_cost = 0.0
    
    # Get today's cost
    today = datetime.now().strftime("%Y-%m-%d")
    today_costs = redis_client.hgetall(f"costs:{today}")
    for cost_value in today_costs.values():
        daily_cost += float(cost_value)
    
    # Get today's request count
    requests_today = redis_client.get(f"requests:{today}") or "0"
    
    return CostMetrics(
        monthly_cost=monthly_cost,
        daily_cost=daily_cost,
        requests_today=int(requests_today),
        average_cost_per_request=daily_cost / max(int(requests_today), 1),
        cost_alert=monthly_cost >= COST_ALERT_THRESHOLD
    )

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
