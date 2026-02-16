package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/ollama-web-api/internal/database"
	"github.com/ollama-web-api/internal/models"
)

// OllamaGenerate godoc
// @Summary Generate text using Ollama
// @Description Send a prompt to Ollama for text generation. Requires a valid project API key and model assignment.
// @Tags ollama
// @Accept json
// @Produce json
// @Param X-API-Key header string true "Project API Key"
// @Param request body models.OllamaRequest true "Ollama request"
// @Success 200 {object} models.OllamaResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Router /api/ollama/generate [post]
func OllamaGenerate(c *fiber.Ctx) error {
	// Get API key from context (set by middleware)
	apiKey, ok := c.Locals("api_key").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error:   "Invalid API key",
			Message: "API key not found in request",
		})
	}

	// Find project by API key
	var project models.Project
	result := database.DB.Where("api_key = ?", apiKey).Preload("Models").First(&project)
	if result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error:   "Invalid API key",
			Message: "Project not found with the provided API key",
		})
	}

	// Check if project is active
	if !project.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(models.ErrorResponse{
			Error:   "Project inactive",
			Message: "This project is currently inactive and cannot use the API",
		})
	}

	// Parse request
	var req models.OllamaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	// Validate that the requested model is assigned to this project
	modelAssigned := false
	for _, pm := range project.Models {
		if pm.ModelName == req.Model {
			modelAssigned = true
			break
		}
	}

	if !modelAssigned {
		return c.Status(fiber.StatusForbidden).JSON(models.ErrorResponse{
			Error:   "Model not available",
			Message: fmt.Sprintf("Model '%s' is not assigned to this project", req.Model),
		})
	}

	// Forward request to Ollama
	ollamaURL := os.Getenv("OLLAMA_BASE_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	requestBody, err := json.Marshal(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to marshal request",
			Message: err.Error(),
		})
	}

	client := &http.Client{
		Timeout: 300 * time.Second, // 5 minutes timeout for long-running requests
	}

	log.Printf("Attempting to connect to Ollama at: %s", fmt.Sprintf("%s/api/generate", ollamaURL))

	resp, err := client.Post(
		fmt.Sprintf("%s/api/generate", ollamaURL),
		"application/json",
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		log.Printf("Connection error to Ollama: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(models.ErrorResponse{
			Error:   "Failed to connect to Ollama",
			Message: err.Error(),
		})
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to read response",
			Message: err.Error(),
		})
	}

	// If Ollama returned an error
	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(models.ErrorResponse{
			Error:   "Ollama API error",
			Message: string(body),
		})
	}

	// Parse and return response
	var ollamaResp models.OllamaResponse
	if err := json.Unmarshal(body, &ollamaResp); err != nil {
		// If we can't parse it, just return the raw response
		c.Set("Content-Type", "application/json")
		return c.Send(body)
	}

	return c.JSON(ollamaResp)
}

// ListOllamaModels godoc
// @Summary List available Ollama models
// @Description Get a list of all models available on the Ollama server
// @Tags ollama
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 502 {object} models.ErrorResponse
// @Router /api/ollama/models [get]
func ListOllamaModels(c *fiber.Ctx) error {
	ollamaURL := os.Getenv("OLLAMA_BASE_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	log.Printf("Attempting to connect to Ollama at: %s", fmt.Sprintf("%s/api/tags", ollamaURL))

	resp, err := client.Get(fmt.Sprintf("%s/api/tags", ollamaURL))
	if err != nil {
		log.Printf("Connection error to Ollama: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(models.ErrorResponse{
			Error:   "Failed to connect to Ollama",
			Message: err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to read response",
			Message: err.Error(),
		})
	}

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(models.ErrorResponse{
			Error:   "Ollama API error",
			Message: string(body),
		})
	}

	c.Set("Content-Type", "application/json")
	return c.Send(body)
}

// PullOllamaModel godoc
// @Summary Pull an Ollama model
// @Description Download and install a model from the Ollama library
// @Tags ollama
// @Accept json
// @Produce json
// @Param request body map[string]string true "Model pull request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 502 {object} models.ErrorResponse
// @Router /api/ollama/models/pull [post]
func PullOllamaModel(c *fiber.Ctx) error {
	ollamaURL := os.Getenv("OLLAMA_BASE_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	var req map[string]string
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	modelName, exists := req["name"]
	if !exists || modelName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: "Model name is required",
		})
	}

	requestBody := map[string]string{"name": modelName}
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to marshal request",
			Message: err.Error(),
		})
	}

	client := &http.Client{
		Timeout: 300 * time.Second, // Long timeout for model downloads
	}

	log.Printf("Pulling Ollama model: %s from %s", modelName, fmt.Sprintf("%s/api/pull", ollamaURL))

	resp, err := client.Post(
		fmt.Sprintf("%s/api/pull", ollamaURL),
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		log.Printf("Connection error pulling model: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(models.ErrorResponse{
			Error:   "Failed to connect to Ollama",
			Message: err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to read response",
			Message: err.Error(),
		})
	}

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(models.ErrorResponse{
			Error:   "Ollama API error",
			Message: string(body),
		})
	}

	c.Set("Content-Type", "application/json")
	return c.Send(body)
}

// DeleteOllamaModel godoc
// @Summary Delete an Ollama model
// @Description Remove a model from the local Ollama instance
// @Tags ollama
// @Accept json
// @Produce json
// @Param request body map[string]string true "Model delete request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 502 {object} models.ErrorResponse
// @Router /api/ollama/models/delete [delete]
func DeleteOllamaModel(c *fiber.Ctx) error {
	ollamaURL := os.Getenv("OLLAMA_BASE_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	var req map[string]string
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
	}

	modelName, exists := req["name"]
	if !exists || modelName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Invalid request",
			Message: "Model name is required",
		})
	}

	requestBody := map[string]string{"name": modelName}
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to marshal request",
			Message: err.Error(),
		})
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	log.Printf("Deleting Ollama model: %s from %s", modelName, fmt.Sprintf("%s/api/delete", ollamaURL))

	reqHttp, err := http.NewRequest("DELETE", fmt.Sprintf("%s/api/delete", ollamaURL), bytes.NewBuffer(jsonBody))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to create request",
			Message: err.Error(),
		})
	}
	reqHttp.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(reqHttp)
	if err != nil {
		log.Printf("Connection error deleting model: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(models.ErrorResponse{
			Error:   "Failed to connect to Ollama",
			Message: err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to read response",
			Message: err.Error(),
		})
	}

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(models.ErrorResponse{
			Error:   "Ollama API error",
			Message: string(body),
		})
	}

	c.Set("Content-Type", "application/json")
	return c.Send(body)
}

// ListRunningOllamaModels godoc
// @Summary List running Ollama models
// @Description Get a list of currently loaded/running models
// @Tags ollama
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 502 {object} models.ErrorResponse
// @Router /api/ollama/models/running [get]
func ListRunningOllamaModels(c *fiber.Ctx) error {
	ollamaURL := os.Getenv("OLLAMA_BASE_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	log.Printf("Getting running models from: %s", fmt.Sprintf("%s/api/ps", ollamaURL))

	resp, err := client.Get(fmt.Sprintf("%s/api/ps", ollamaURL))
	if err != nil {
		log.Printf("Connection error getting running models: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(models.ErrorResponse{
			Error:   "Failed to connect to Ollama",
			Message: err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to read response",
			Message: err.Error(),
		})
	}

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(models.ErrorResponse{
			Error:   "Ollama API error",
			Message: string(body),
		})
	}

	c.Set("Content-Type", "application/json")
	return c.Send(body)
}
