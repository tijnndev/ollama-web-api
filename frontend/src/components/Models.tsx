import React, { useState, useEffect, useCallback } from 'react';
import { listOllamaModels, listRunningOllamaModels, pullOllamaModel, deleteOllamaModel } from '../api';

interface Model {
  name: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

interface RunningModel {
  name: string;
  size: number;
  size_vram: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  expires_at: string;
  size_vram_str?: string;
}

const Models: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pullingModel, setPullingModel] = useState<string>('');
  const [deletingModel, setDeletingModel] = useState<string>('');
  const [newModelName, setNewModelName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchModels = async () => {
    try {
      const response = await listOllamaModels();
      setModels(response.models || []);
    } catch (err) {
      setError('Failed to fetch models');
      console.error('Error fetching models:', err);
    }
  };

  const fetchRunningModels = async () => {
    try {
      const response = await listRunningOllamaModels();
      setRunningModels(response.models || []);
    } catch (err) {
      console.error('Error fetching running models:', err);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchModels(), fetchRunningModels()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePullModel = async (modelName: string) => {
    if (!modelName.trim()) return;

    setPullingModel(modelName);
    setError('');

    try {
      await pullOllamaModel(modelName);
      await fetchModels();
      setNewModelName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to pull model');
    } finally {
      setPullingModel('');
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<string>('');

  const handleDeleteModel = async (modelName: string) => {
    if (confirmDelete === modelName) {
      // Confirmed deletion
      setDeletingModel(modelName);
      setError('');
      setConfirmDelete('');

      try {
        await deleteOllamaModel(modelName);
        await fetchModels();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete model');
      } finally {
        setDeletingModel('');
      }
    } else {
      // Ask for confirmation
      setConfirmDelete(modelName);
    }
  };

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Models</h1>
        <div className="loading">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Models</h1>

      {error && (
        <div className="error-message" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
          {error}
        </div>
      )}

      {/* Pull New Model */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h2>Pull New Model</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="e.g., llama2:7b, codellama:13b"
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button
            onClick={() => handlePullModel(newModelName)}
            disabled={pullingModel === newModelName || !newModelName.trim()}
            className="primary-button"
          >
            {pullingModel === newModelName ? 'Pulling...' : 'Pull Model'}
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          Enter a model name from the Ollama library (e.g., llama2, codellama, mistral)
        </p>
      </div>

      {/* Running Models */}
      {runningModels.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h2>Running Models ({runningModels.length})</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>VRAM Usage</th>
                  <th>Family</th>
                </tr>
              </thead>
              <tbody>
                {runningModels.map((model) => (
                  <tr key={model.digest}>
                    <td>{model.name}</td>
                    <td>{formatSize(model.size)}</td>
                    <td>{formatSize(model.size_vram)}</td>
                    <td>{model.details?.family || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available Models */}
      <div className="card">
        <h2>Available Models ({models.length})</h2>
        {models.length === 0 ? (
          <p>No models installed. Pull a model above to get started.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Family</th>
                  <th>Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.digest}>
                    <td>{model.name}</td>
                    <td>{formatSize(model.size)}</td>
                    <td>{model.details?.family || 'Unknown'}</td>
                    <td>{new Date(model.modified_at).toLocaleDateString()}</td>
                    <td>
                      {confirmDelete === model.name ? (
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#c33' }}>Confirm delete?</span>
                          <button
                            onClick={() => handleDeleteModel(model.name)}
                            className="error-button"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete('')}
                            style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#666', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteModel(model.name)}
                          disabled={deletingModel === model.name}
                          className="error-button"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          {deletingModel === model.name ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Models;