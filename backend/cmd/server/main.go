package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/joho/godotenv"
	"github.com/ollama-web-api/internal/database"
	"github.com/ollama-web-api/internal/handlers"
	"github.com/ollama-web-api/internal/middleware"

	_ "github.com/ollama-web-api/docs" // Import swagger docs
)

// @title Ollama Web API
// @version 1.0
// @description API for managing Ollama LLM requests with project-based access control
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@example.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:3000
// @BasePath /api
// @schemes http https

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	if err := database.ConnectDB(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error":   "Internal Server Error",
				"message": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-API-Key",
		AllowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	}))

	// API routes
	api := app.Group("/api")

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
		})
	})

	// Swagger documentation
	api.Get("/swagger/*", swagger.HandlerDefault)

	// Auth routes (no authentication required)
	auth := api.Group("/auth")
	auth.Post("/login", handlers.Login)

	// Project routes (admin authentication required)
	projects := api.Group("/projects", middleware.AuthRequired())
	projects.Get("/", handlers.ListProjects)
	projects.Post("/", handlers.CreateProject)
	projects.Get("/:id", handlers.GetProject)
	projects.Put("/:id", handlers.UpdateProject)
	projects.Patch("/:id/toggle", handlers.ToggleProjectStatus)
	projects.Delete("/:id", handlers.DeleteProject)

	// Model assignment routes (admin authentication required)
	projects.Get("/:id/models", handlers.ListProjectModels)
	projects.Post("/:id/models", handlers.AssignModel)
	projects.Delete("/:id/models/:modelId", handlers.UnassignModel)

	// Ollama routes
	ollama := api.Group("/ollama")
	ollama.Get("/models", middleware.AuthRequired(), handlers.ListOllamaModels)
	ollama.Get("/models/running", middleware.AuthRequired(), handlers.ListRunningOllamaModels)
	ollama.Post("/models/pull", middleware.AuthRequired(), handlers.PullOllamaModel)
	ollama.Delete("/models/delete", middleware.AuthRequired(), handlers.DeleteOllamaModel)
	ollama.Post("/generate", middleware.ValidateAPIKey(), handlers.OllamaGenerate)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Swagger documentation available at http://localhost:%s/swagger/", port)

	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
