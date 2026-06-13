@echo off
setlocal

set "DOCKER=docker"
where docker >nul 2>nul
if errorlevel 1 if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
  set "DOCKER=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
)

"%DOCKER%" --version >nul 2>nul
if errorlevel 1 (
  echo Docker is not installed or not available in PATH.
  echo Install Docker Desktop, restart the terminal, then run this script again.
  exit /b 1
)

"%DOCKER%" compose version >nul 2>nul
if errorlevel 1 (
  echo Docker Compose is not available.
  echo Update Docker Desktop, restart the terminal, then run this script again.
  exit /b 1
)

"%DOCKER%" compose -f docker-compose.local.yml up -d --build
if errorlevel 1 exit /b 1

echo.
echo SGOMarket Docker deployment is starting.
echo Site:    http://localhost:8080
echo Grafana: http://localhost:3300
echo.
"%DOCKER%" compose -f docker-compose.local.yml ps
