package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ollama-web-api/internal/database"
	"github.com/ollama-web-api/internal/models"
)

// AssignModel godoc
// @Summary Assign a model to a project
// @Description Add an available LLM model to a project
// @Tags models
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param model body models.AssignModelRequest true "Model name"
// @Success 201 {object} models.ProjectModel
// @Failure 400 {object} models.ErrorResponse
// @Router /api/projects/{id}/models [post]
func AssignModel(c *fiber.Ctx) error {
	id := c.Params("id")
	var project models.Project

	if err := database.DB.First(&project, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Project not found",
			Message: err.Error(),
		})
	}

	var req models.AssignModelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	// Check if model is already assigned
	var existingModel models.ProjectModel
	result := database.DB.Where("project_id = ? AND model_name = ?", project.ID, req.ModelName).First(&existingModel)
	if result.Error == nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Model already assigned",
			Message: "This model is already assigned to the project",
		})
	}

	projectModel := models.ProjectModel{
		ProjectID: project.ID,
		ModelName: req.ModelName,
	}

	if err := database.DB.Create(&projectModel).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Failed to assign model",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(projectModel)
}

// UnassignModel godoc
// @Summary Unassign a model from a project
// @Description Remove a model assignment from a project
// @Tags models
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Param modelId path int true "Model assignment ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /api/projects/{id}/models/{modelId} [delete]
func UnassignModel(c *fiber.Ctx) error {
	projectID := c.Params("id")
	modelID := c.Params("modelId")

	var projectModel models.ProjectModel
	if err := database.DB.Where("id = ? AND project_id = ?", modelID, projectID).First(&projectModel).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Model assignment not found",
			Message: err.Error(),
		})
	}

	if err := database.DB.Delete(&projectModel).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to unassign model",
			Message: err.Error(),
		})
	}

	return c.JSON(models.SuccessResponse{
		Message: "Model unassigned successfully",
	})
}

// ListProjectModels godoc
// @Summary List models assigned to a project
// @Description Get all models assigned to a specific project
// @Tags models
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} models.ProjectModel
// @Failure 404 {object} models.ErrorResponse
// @Router /api/projects/{id}/models [get]
func ListProjectModels(c *fiber.Ctx) error {
	projectID := c.Params("id")

	var project models.Project
	if err := database.DB.First(&project, projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error:   "Project not found",
			Message: err.Error(),
		})
	}

	var projectModels []models.ProjectModel
	if err := database.DB.Where("project_id = ?", projectID).Find(&projectModels).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to fetch models",
			Message: err.Error(),
		})
	}

	return c.JSON(projectModels)
}
