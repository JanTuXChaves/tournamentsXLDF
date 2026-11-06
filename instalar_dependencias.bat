@echo off
chcp 65001 >nul
title Instalador Automatico Kudow (Novo Computador)
echo ====================================================================
echo   CONFIGURACAO INICIAL DO PROJETO KUDOW EM NOVO COMPUTADOR
echo ====================================================================
echo.

echo [1/3] Criando ambiente virtual Python (venv) e instalando dependencias do Backend...
cd /d "%~dp0kudow\backend"
if not exist "venv" (
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERRO] Python nao encontrado no PATH. Instale o Python 3.11+ marcando "Add Python to PATH".
        pause
        exit /b 1
    )
)
call .\venv\Scripts\python.exe -m pip install --upgrade pip
call .\venv\Scripts\pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar pacotes do Backend.
    pause
    exit /b 1
)

echo.
echo [2/3] Instalando pacotes do Frontend (Node.js / npm)...
cd /d "%~dp0kudow\frontend"
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao executar npm install. Verifique se o Node.js LTS esta instalado.
    pause
    exit /b 1
)

echo.
echo [3/3] Compilando versao de producao do Frontend...
call npm run build

echo.
echo ====================================================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo   Agora basta abrir o arquivo "iniciar_servidor.bat" para usar.
echo ====================================================================
pause

