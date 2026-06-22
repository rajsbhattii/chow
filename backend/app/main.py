from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Chow/Ciao API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}
