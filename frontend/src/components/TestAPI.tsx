import React, { useState, useEffect } from 'react';
import { listProjects, generateText } from '../api';
import type { Project, OllamaRequest } from '../api';

const TestAPI: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await listProjects();
      const activeProjects = data.filter(p => p.is_active);
      setProjects(activeProjects);
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === parseInt(projectId));
    setSelectedProject(project || null);
    setSelectedModel('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedModel || !prompt) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const request: OllamaRequest = {
        model: selectedModel,
        prompt: prompt,
        stream: false,
      };

      const result = await generateText(selectedProject.api_key, request);
      setResponse(result.response || JSON.stringify(result, null, 2));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ color: 'white', marginBottom: '24px' }}>Test API</h1>

      <div className="card">
        <h2 className="section-header">Send Request to Ollama</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '16px', fontSize: '16px' }}>Select Project</label>
            <select
              className="input"
              value={selectedProject?.id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">-- Select a project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.models?.length || 0} models)
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="text"
                  className="input"
                  value={selectedProject.api_key}
                  readOnly
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Model</label>
                <select
                  className="input"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="">-- Select a model --</option>
                  {selectedProject.models?.map((model) => (
                    <option key={model.id} value={model.model_name}>
                      {model.model_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prompt</label>
                <textarea
                  className="textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                  rows={6}
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                disabled={loading || !selectedModel || !prompt}
              >
                {loading ? 'Generating...' : 'Send Request'}
              </button>
            </>
          )}
        </form>
      </div>

      {response && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2 style={{ marginTop: 0 }}>Response</h2>
          <div className="code-block">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{response}</pre>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '24px' }}>
        <h2 style={{ marginTop: 0 }}>API Usage Example</h2>
        <p>You can also use the API directly with cURL or any HTTP client:</p>
        {selectedProject && selectedModel && (
          <div className="code-block">
            <pre style={{ margin: 0 }}>{`curl -X POST http://localhost:8080/api/ollama/generate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${selectedProject.api_key}" \\
  -d '{
    "model": "${selectedModel}",
    "prompt": "Your prompt here",
    "stream": false
  }'`}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAPI;
