import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Project {
  id: number;
  name: string;
  description: string;
  api_key: string;
  is_active: boolean;
  models?: ProjectModel[];
  created_at: string;
  updated_at: string;
}

export interface ProjectModel {
  id: number;
  project_id: number;
  model_name: string;
  created_at: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// Auth API
export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

// Project API
export const listProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects');
  return response.data;
};

export const getProject = async (id: number): Promise<Project> => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (name: string, description: string): Promise<Project> => {
  const response = await api.post('/projects', { name, description });
  return response.data;
};

export const updateProject = async (id: number, name: string, description: string): Promise<Project> => {
  const response = await api.put(`/projects/${id}`, { name, description });
  return response.data;
};

export const toggleProjectStatus = async (id: number): Promise<Project> => {
  const response = await api.patch(`/projects/${id}/toggle`);
  return response.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

// Model Assignment API
export const listProjectModels = async (projectId: number): Promise<ProjectModel[]> => {
  const response = await api.get(`/projects/${projectId}/models`);
  return response.data;
};

export const assignModel = async (projectId: number, modelName: string): Promise<ProjectModel> => {
  const response = await api.post(`/projects/${projectId}/models`, { model_name: modelName });
  return response.data;
};

export const unassignModel = async (projectId: number, modelId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}/models/${modelId}`);
};

// Ollama API
export const listOllamaModels = async () => {
  const response = await api.get('/ollama/models');
  return response.data;
};

export const listRunningOllamaModels = async () => {
  const response = await api.get('/ollama/models/running');
  return response.data;
};

export const pullOllamaModel = async (modelName: string) => {
  const response = await api.post('/ollama/models/pull', { name: modelName });
  return response.data;
};

export const deleteOllamaModel = async (modelName: string) => {
  const response = await api.delete('/ollama/models/delete', { data: { name: modelName } });
  return response.data;
};

export const generateText = async (apiKey: string, request: OllamaRequest): Promise<OllamaResponse> => {
  const response = await axios.post(`${API_BASE_URL}/ollama/generate`, request, {
    headers: {
      'X-API-Key': apiKey,
    },
  });
  return response.data;
};

// Streamed generate endpoint with attachments support.
// onChunk will be called for each decoded text chunk received from the server.
export const streamGenerate = async (
  apiKey: string,
  model: string,
  prompt: string,
  files?: File[],
  onChunk?: (chunk: string) => void
): Promise<void> => {
  const url = `${API_BASE_URL}/ollama/generate`;

  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('stream', 'true');
  if (files && files.length > 0) {
    for (const f of files) {
      form.append('attachments', f);
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    } as any,
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Server error: ${res.status} ${txt}`);
  }

  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  
  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete JSON lines
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
          const json = JSON.parse(trimmed);
          // Extract only the "response" field from each JSON object
          if (json.response && onChunk) {
            onChunk(json.response);
          }
        } catch (e) {
          // Skip malformed JSON
          console.warn('Failed to parse JSON line:', trimmed);
        }
      }
    }
  }
  
  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer.trim());
      if (json.response && onChunk) {
        onChunk(json.response);
      }
    } catch (e) {
      // Ignore final parse errors
    }
  }
};

export const validateApiKey = async (apiKey: string) => {
  const response = await axios.get(`${API_BASE_URL}/validate_key`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });
  return response.data;
};

export default api;
