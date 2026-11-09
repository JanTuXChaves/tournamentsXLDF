@echo off
chcp 65001 >nul
title Enviar Projeto para o GitHub
cd /d "%~dp0"
echo ====================================================================
echo   ENVIANDO PROJETO KUDOW PARA O GITHUB (JanTuXChaves/tournamentsXLDF)
echo ====================================================================
echo.

if not exist ".git" (
    echo [1/4] Inicializando repositorio Git local...
    git init -b main
    git remote add origin https://github.com/JanTuXChaves/tournamentsXLDF.git
) else (
    git remote set-url origin https://github.com/JanTuXChaves/tournamentsXLDF.git 2>nul || git remote add origin https://github.com/JanTuXChaves/tournamentsXLDF.git
)

echo [2/4] Preparando arquivos...
git add -A
git commit -m "chore: versao completa do sistema Kudow (Backend, Frontend e Android)" 2>nul

echo [3/4] Enviando para o GitHub...
git branch -M main
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo [SUCESSO] Codigo enviado com sucesso para https://github.com/JanTuXChaves/tournamentsXLDF !
) else (
    echo [AVISO] Verifique se a janela de login do GitHub apareceu para autorizar.
)
pause
