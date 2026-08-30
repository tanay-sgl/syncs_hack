from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base, engine, get_db
from app.routers import auth, groups, intents, skills, users
from app.websocket.manager import manager

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Converge API",
    description="AI-powered real-time coordination platform — turn intent into people.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(intents.router, prefix="/api")
app.include_router(groups.router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "Converge API",
        "tagline": "Turn intent into people.",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "auth": "/api/auth",
            "users": "/api/users",
            "intents": "/api/intents",
            "groups": "/api/groups",
            "skills": "/api/skills",
        },
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "converge-api"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            if payload.get("type") != "access":
                await websocket.close(code=1008)
                return
            user_id = int(payload.get("sub"))
        except (JWTError, TypeError, ValueError):
            await websocket.close(code=1008)
            return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
