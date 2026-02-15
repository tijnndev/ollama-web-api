package handlers

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gofiber/fiber/v2"
	"github.com/ollama-web-api/internal/database"
	"github.com/ollama-web-api/internal/models"
)

// generateAPIKey generates a random API key
func generateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// ListProjects godoc
// @Summary List all projects
// @Description Get a list of all projects
// @Tags projects
// @Security BearerAuth
// @Produce json
// @Success 200 {array} models.Project
// @Failure 401 {object} models.ErrorResponse
// @Router /api/projects [get]
func ListProjects(c *fiber.Ctx) error {
	var projects []models.Project
	result := database.DB.Preload("Models").Find(&projects)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to fetch projects",
			Message: result.Error.Error(),
		})
	}

	return c.JSON(projects)
}

// GetProject godoc
// @Summary Get a project by ID
// @Description Get detailed information about a specific project
// @Tags projects
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} models.Project
// @Failure 404 {object} models.ErrorResponse
// @Router /api/projects/{id} [get]
func GetProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project models.Project

	result := database.DB.Preload("Models").First(&project, id)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Project not found",
			Message: result.Error.Error(),
		})
	}

	return c.JSON(project)
}

// CreateProject godoc
// @Summary Create a new project
// @Description Create a new project with a unique API key
// @Tags projects
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param project body models.CreateProjectRequest true "Project details"
// @Success 201 {object} models.Project
// @Failure 400 {object} models.ErrorResponse
// @Router /api/projects [post]
func CreateProject(c *fiber.Ctx) error {
	var req models.CreateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	apiKey, err := generateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to generate API key",
			Message: err.Error(),
		})
	}

	project := models.Project{
		Name:        req.Name,
		Description: req.Description,
		APIKey:      apiKey,
		IsActive:    true,
	}

	result := database.DB.Create(&project)
	if result.Error != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Failed to create project",
			Message: result.Error.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(project)
}

// UpdateProject godoc
// @Summary Update a project
// @Description Update project details
// @Tags projects
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param project body models.CreateProjectRequest true "Project details"
// @Success 200 {object} models.Project
// @Failure 400 {object} models.ErrorResponse
// @Router /api/projects/{id} [put]
func UpdateProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project models.Project

	if err := database.DB.First(&project, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Project not found",
			Message: err.Error(),
		})
	}

	var req models.CreateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	project.Name = req.Name
	project.Description = req.Description

	if err := database.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Failed to update project",
			Message: err.Error(),
		})
	}

	return c.JSON(project)
}

// ToggleProjectStatus godoc
// @Summary Toggle project active status
// @Description Activate or deactivate a project
// @Tags projects
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} models.Project
// @Failure 404 {object} models.ErrorResponse
// @Router /api/projects/{id}/toggle [patch]
func ToggleProjectStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var project models.Project

	if err := database.DB.First(&project, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Project not found",
			Message: err.Error(),
		})
	}

	project.IsActive = !project.IsActive

	if err := database.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to update project status",
			Message: err.Error(),
		})
	}

	return c.JSON(project)
}

// DeleteProject godoc
// @Summary Delete a project
// @Description Soft delete a project
// @Tags projects
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /api/projects/{id} [delete]
func DeleteProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project models.Project

	if err := database.DB.First(&project, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Project not found",
			Message: err.Error(),
		})
	}

	if err := database.DB.Delete(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to delete project",
			Message: err.Error(),
		})
	}

	return c.JSON(models.SuccessResponse{
		Message: "Project deleted successfully",
	})
}
