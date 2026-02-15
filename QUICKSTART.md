# Ollama Web API - Quick Setup Guide

## First Time Setup

1. **Copy environment file:**
   ```bash
   copy .env.example .env
   ```

2. **Edit .env file** with your settings:
   - Set `ADMIN_USER` and `ADMIN_PASSWORD`
   - Update `JWT_SECRET` with a random string
   - Configure `OLLAMA_BASE_URL` if needed

3. **Start the services:**
   ```bash
   # Windows
   start.bat
   
   # Linux/Mac
   ./start.sh
   
   # Or manually
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Swagger Docs: http://localhost:8080/swagger/

## Initial Login

- Username: Value of `ADMIN_USER` in .env (default: admin)
- Password: Value of `ADMIN_PASSWORD` in .env

## Quick Workflow

1. **Login** to the admin panel
2. **Create a project** in the Projects tab
3. **Assign models** to the project
4. **Copy the API key** from the project
5. **Test it** in the Test API tab

## API Usage Example

```bash
curl -X POST http://localhost:8080/api/ollama/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_PROJECT_API_KEY" \
  -d '{
    "model": "llama2",
    "prompt": "Explain quantum computing in simple terms",
    "stream": false
  }'
```

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart
docker-compose restart

# Clean everything (including database)
docker-compose down -v
```

## Troubleshooting

**Can't connect to Ollama?**
- Make sure Ollama is running: `ollama serve`
- Check OLLAMA_BASE_URL in .env
- Windows/Mac: Use `http://host.docker.internal:11434`

**Frontend not loading?**
- Check if all containers are running: `docker-compose ps`
- View frontend logs: `docker-compose logs frontend`

**Database errors?**
- Reset database: `docker-compose down -v && docker-compose up -d`

For detailed documentation, see README.md
