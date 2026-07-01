from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.routers.auth import router as auth_router
from app.routers.restaurants import router as restaurants_router
from app.routers.saves import router as saves_router
from app.routers.swipes import router as swipes_router
from app.routers.visits import router as visits_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Chow API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(restaurants_router)
app.include_router(saves_router)
app.include_router(swipes_router)
app.include_router(visits_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
