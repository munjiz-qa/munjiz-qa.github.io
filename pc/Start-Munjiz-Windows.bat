@echo off
title Munjiz - keep this window open
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\server.ps1" -Root "%~dp0site"
if errorlevel 1 pause
