# Ollama Web API

A comprehensive Golang web API with Docker support that provides project-based access control for Ollama LLM requests. Features include automatic Swagger documentation, React management UI, and PostgreSQL database for project and model management.

## Features

- 🚀 **Golang Backend** - Fast, efficient API built with Fiber framework
- 🔒 **Authentication** - Simple admin auth using environment variables
- 📊 **Project Management** - Create and manage multiple projects with unique API keys
- 🎯 **Model Assignment** - Assign specific Ollama models to projects
- 🔄 **Active/Inactive States** - Control project access with toggle functionality
- 📝 **Swagger Documentation** - Auto-generated API documentation
- ⚛️ **React UI** - Beautiful admin interface for managing projects and testing
- 🐳 **Docker Support** - Fully containerized with docker-compose
- 💾 **PostgreSQL Database** - Robust data persistence with GORM
- 🔌 **Ollama Integration** - Seamless connection to local Ollama instance

## Architecture

```
├── backend/                # Golang API
│   ├── cmd/server/        # Main application entry point
│   ├── internal/          # Internal packages
│   │   ├── database/     # Database connection and migrations
│   │   ├── handlers/     # HTTP request handlers
│   │   ├── middleware/   # Authentication middleware
│   │   └── models/       # Data models
│   └── docs/             # Swagger documentation
├── frontend/              # React TypeScript UI
│   ├── src/
│   │   ├── components/   # React components
│   │   └── api.ts        # API client
│   └── public/
└── docker-compose.yml     # Container orchestration
```

## Prerequisites

- Docker and Docker Compose
- Ollama running locally (default: http://localhost:11434)
- Make (optional, for convenience commands)

## Quick Start

### 1. Clone and Setup

```bash
cd ollama-web-api

# Copy environment file
copy .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Admin Authentication
ADMIN_USER=admin
ADMIN_PASSWORD=your-secure-password

# Database
DB_USER=ollama
DB_PASSWORD=ollama123
DB_NAME=ollama_api

# Ollama Configuration
OLLAMA_BASE_URL=http://host.docker.internal:11434

# JWT Secret
JWT_SECRET=your-secret-key-change-this
```

### 3. Start Services

```bash
# Using Make
make up

# Or using docker-compose directly
docker-compose up -d
```

### 4. Access the Application

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Swagger Docs**: http://localhost:8080/swagger/

## Usage

### Admin Login

1. Navigate to http://localhost:3000
2. Login with your `ADMIN_USER` and `ADMIN_PASSWORD` from `.env`

### Creating a Project

1. Go to the **Projects** page
2. Click **"+ New Project"**
3. Enter project name and description
4. An API key will be automatically generated

### Assigning Models

1. Click **"Models"** button for a project
2. Select from available Ollama models
3. Assigned models can be used with that project's API key

### Testing the API

1. Go to **Test API** page
2. Select a project
3. Choose an assigned model
4. Enter a prompt and send request

### Using the API Programmatically

```bash
# Example: Generate text with Ollama
curl -X POST http://localhost:8080/api/ollama/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_PROJECT_API_KEY" \
  -d '{
    "model": "llama2",
    "prompt": "Why is the sky blue?",
    "stream": false
  }'
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Admin login (returns JWT token)

### Projects (Admin Only - Requires JWT)

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `PATCH /api/projects/:id/toggle` - Toggle active/inactive status
- `DELETE /api/projects/:id` - Delete project

### Model Assignment (Admin Only - Requires JWT)

- `GET /api/projects/:id/models` - List assigned models
- `POST /api/projects/:id/models` - Assign model to project
- `DELETE /api/projects/:id/models/:modelId` - Remove model assignment

### Ollama

- `GET /api/ollama/models` - List available Ollama models (Admin only)
- `POST /api/ollama/generate` - Generate text (Requires X-API-Key header)

## Project States

### Active Projects
- Can make API requests
- Models can be used
- Visible in UI with green badge

### Inactive Projects
- **Cannot** make API requests
- API returns 403 Forbidden
- Visible in UI with red badge
- Can be reactivated at any time

## Development

### Backend Development

```bash
cd backend

# Install dependencies
go mod download

# Run tests
go test ./...

# Generate Swagger docs
swag init -g cmd/server/main.go -o docs

# Build
go build -o main ./cmd/server
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Database Migrations

Migrations run automatically on startup. Models are defined in `backend/internal/models/models.go`.

## Docker Commands

```bash
# Build and start all services
make up

# Stop all services
make down

# View logs
make logs

# Restart services
make restart

# Clean up (removes volumes)
make clean

# Rebuild images
make build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USER` | Admin username | admin |
| `ADMIN_PASSWORD` | Admin password | changeme |
| `DB_HOST` | PostgreSQL host | postgres |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | Database user | ollama |
| `DB_PASSWORD` | Database password | ollama123 |
| `DB_NAME` | Database name | ollama_api |
| `PORT` | Backend server port | 8080 |
| `OLLAMA_BASE_URL` | Ollama API URL | http://host.docker.internal:11434 |
| `JWT_SECRET` | JWT signing secret | (required) |

## Security Notes

1. **Change Default Credentials**: Update `ADMIN_USER` and `ADMIN_PASSWORD` in production
2. **JWT Secret**: Use a strong, random `JWT_SECRET`
3. **API Keys**: Generated API keys are 64-character random hex strings
4. **HTTPS**: In production, use HTTPS/TLS for all connections
5. **Database**: Secure your PostgreSQL instance with strong passwords

## Troubleshooting

### Ollama Connection Issues

If the API can't connect to Ollama:

1. Ensure Ollama is running: `ollama serve`
2. Check `OLLAMA_BASE_URL` in `.env`
3. On Windows/Mac, use `http://host.docker.internal:11434`
4. On Linux, use `http://172.17.0.1:11434` or host network mode

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Frontend Not Loading

```bash
# Rebuild frontend
cd frontend
npm install
npm run build

# Restart container
docker-compose restart frontend
```

## Tech Stack

### Backend
- Go 1.21
- Fiber (Web Framework)
- GORM (ORM)
- PostgreSQL
- Swagger/OpenAPI
- JWT Authentication

### Frontend
- React 18
- TypeScript
- React Router
- Axios
- CSS (Custom styling)

### Infrastructure
- Docker
- Docker Compose
- Nginx (Frontend reverse proxy)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Check the Swagger documentation at `/swagger/`
- Review application logs: `docker-compose logs`
- Open an issue on GitHub

## Roadmap

- [ ] Rate limiting per project
- [ ] Usage analytics and metrics
- [ ] Multiple admin users with roles
- [ ] Webhook support for completion events
- [ ] Streaming response support
- [ ] Project usage quotas
- [ ] API request logging and history