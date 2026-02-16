package models

import (
	"time"

	"gorm.io/gorm"
)

// Project represents a project in the system
type Project struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null" json:"name"`
	Description string         `json:"description"`
	APIKey      string         `gorm:"uniqueIndex;not null" json:"api_key"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	Models      []ProjectModel `gorm:"foreignKey:ProjectID" json:"models,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ProjectModel represents the many-to-many relationship between projects and available models
type ProjectModel struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProjectID uint      `gorm:"not null;index" json:"project_id"`
	ModelName string    `gorm:"not null" json:"model_name"`
	CreatedAt time.Time `json:"created_at"`
}

// OllamaRequest represents a request to the Ollama API
type OllamaRequest struct {
	Model  string   `json:"model" example:"llama2"`
	Prompt string   `json:"prompt" example:"Why is the sky blue?"`
	Stream bool     `json:"stream" example:"false"`
	Images []string `json:"images,omitempty"` // base64-encoded images for vision models
}

// OllamaResponse represents a response from the Ollama API
type OllamaResponse struct {
	Model     string `json:"model"`
	CreatedAt string `json:"created_at"`
	Response  string `json:"response"`
	Done      bool   `json:"done"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error" example:"Invalid request"`
	Message string `json:"message,omitempty" example:"Detailed error message"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string      `json:"message" example:"Operation successful"`
	Data    interface{} `json:"data,omitempty"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username" example:"admin"`
	Password string `json:"password" example:"password"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
}

// CreateProjectRequest represents a request to create a new project
type CreateProjectRequest struct {
	Name        string `json:"name" example:"My Project"`
	Description string `json:"description" example:"A test project"`
}

// AssignModelRequest represents a request to assign a model to a project
type AssignModelRequest struct {
	ModelName string `json:"model_name" example:"llama2"`
}
