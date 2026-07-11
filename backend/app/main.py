from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import engine
from app.models import Base
from app.routers.auth import router as auth_router
from app.routers.profile import router as profile_router
from app.routers.restaurants import router as restaurants_router
from app.routers.saves import router as saves_router
from app.routers.swipes import router as swipes_router
from app.routers.visits import router as visits_router

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Chow API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(restaurants_router)
app.include_router(saves_router)
app.include_router(swipes_router)
app.include_router(visits_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
