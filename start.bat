@echo off
echo ====================================
echo   Ollama Web API - Startup Script
echo ====================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo Please edit .env file with your credentials before continuing!
    echo Press any key to open .env in notepad...
    pause >nul
    notepad .env
    echo.
)

echo [INFO] Starting services with Docker Compose...
echo.

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo   Services Started Successfully!
    echo ====================================
    echo.
    echo Frontend:  http://localhost:3000
    echo Backend:   http://localhost:8080
    echo Swagger:   http://localhost:8080/swagger/
    echo.
    echo To view logs: docker-compose logs -f
    echo To stop:      docker-compose down
    echo.
) else (
    echo.
    echo [ERROR] Failed to start services!
    echo Please check Docker is running and try again.
    echo.
)

pause
