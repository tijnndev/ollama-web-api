package handlers

import (
	"os"

	"github.com/gofiber/fiber/v2"
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
