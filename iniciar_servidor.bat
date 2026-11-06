@echo off
chcp 65001 >nul
title Servidor Oficial Kudow - Auto-Hospedagem
echo ====================================================================
echo   SISTEMA DE GESTAO DE TORNEIOS KUDOW - SERVIDOR UNIFICADO (PC)
echo ====================================================================
echo.

cd /d "%~dp0kudow\frontend"
echo [1/2] Compilando interface visual (Frontend)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar o Frontend.
    pause
    exit /b 1
)

echo.
echo [2/2] Enderecos de acesso na sua rede local (Wi-Fi / Cabo):
echo       - Neste computador: http://localhost:8000
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=* delims= " %%b in ("%%a") do (
        echo       - Celulares / TVs / Mesas no mesmo Wi-Fi: http://%%b:8000
    )
)
echo.
echo Pressione CTRL+C a qualquer momento para desligar o servidor.
echo ====================================================================
echo.

cd /d "%~dp0kudow\backend"
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
pause

