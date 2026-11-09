from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, Base
import models
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from routers import auth, usuarios, entidades, atletas, categorias, eventos, colaboradores, ranking, placar, financeiro

Base.metadata.create_all(bind=engine)

IS_PROD = os.getenv("ENVIRONMENT", "development").lower() == "production"

app = FastAPI(
    title="Kudow API",
    description="API do Sistema de Gestão de Torneios Kudow",
    version="1.0.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
)

MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media")
os.makedirs(os.path.join(MEDIA_DIR, "certificados"), exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=("*" not in allowed_origins),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(entidades.router)
app.include_router(atletas.router)
app.include_router(categorias.router)
app.include_router(eventos.router)
app.include_router(colaboradores.router)
app.include_router(ranking.router)
app.include_router(placar.router)
app.include_router(financeiro.router)

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        candidate = os.path.abspath(os.path.join(FRONTEND_DIST, full_path))
        if full_path and candidate.startswith(FRONTEND_DIST) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Bem-vindo à API do Kudow. Status: Autenticação Inicializada!"}
