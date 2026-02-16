package handlers

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/ollama-web-api/internal/database"
	"github.com/ollama-web-api/internal/middleware"
	"github.com/ollama-web-api/internal/models"
)

// Login godoc
// @Summary Admin login
// @Description Login with admin credentials to get JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body models.LoginRequest true "Login credentials"
// @Success 200 {object} models.LoginResponse
// @Failure 401 {object} models.ErrorResponse
// @Router /api/auth/login [post]
func Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	adminUser := os.Getenv("ADMIN_USER")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if req.Username != adminUser || req.Password != adminPassword {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error:   "Invalid credentials",
			Message: "Username or password is incorrect",
		})
	}

	token, err := middleware.GenerateToken(req.Username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to generate token",
			Message: err.Error(),
		})
	}

	return c.JSON(models.LoginResponse{
		Token: token,
	})
}

// ValidateProjectKey godoc
// @Summary Validate project API key
// @Description Check whether the provided X-API-Key belongs to an active project
// @Tags auth
// @Accept json
// @Produce json
// @Param X-API-Key header string true "Project API Key"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Router /api/validate_key [get]
func ValidateProjectKey(c *fiber.Ctx) error {
	apiKey, ok := c.Locals("api_key").(string)
	if !ok || apiKey == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error:   "Invalid API key",
			Message: "API key not provided",
		})
	}

	var project models.Project
	result := database.DB.Where("api_key = ?", apiKey).First(&project)
	if result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error:   "Invalid API key",
			Message: "Project not found with the provided API key",
		})
	}

	if !project.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(models.ErrorResponse{
			Error:   "Project inactive",
			Message: "This project is currently inactive",
		})
	}

	return c.JSON(fiber.Map{
		"valid":   true,
		"project": fiber.Map{"id": project.ID, "name": project.Name},
	})
}
