import React, { useState, useEffect } from 'react';
import {
  listProjects,
  createProject,
  updateProject,
  toggleProjectStatus,
  deleteProject,
  listProjectModels,
  assignModel,
  unassignModel,
  listOllamaModels,
} from '../api';
import type { Project, ProjectModel } from '../api';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [projectModels, setProjectModels] = useState<ProjectModel[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
    loadAvailableModels();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const data = await listOllamaModels();
      setAvailableModels(data.models || []);
    } catch (err) {
      console.error('Failed to load models');
    }
  };

  const handleCreate = async () => {
    try {
      await createProject(formData.name, formData.description);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    }
  };

  const handleEdit = async () => {
    if (!selectedProject) return;
    try {
      await updateProject(selectedProject.id, formData.name, formData.description);
      setShowEditModal(false);
      setSelectedProject(null);
      setFormData({ name: '', description: '' });
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update project');
    }
  };

  const handleToggleStatus = async (project: Project) => {
    try {
      await toggleProjectStatus(project.id);
      loadProjects();
    } catch (err) {
      setError('Failed to toggle project status');
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Are you sure you want to delete ${project.name}?`)) return;
    try {
      await deleteProject(project.id);
      loadProjects();
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({ name: project.name, description: project.description });
    setShowEditModal(true);
  };

  const openModelsModal = async (project: Project) => {
    setSelectedProject(project);
    try {
      const models = await listProjectModels(project.id);
      setProjectModels(models);
      setShowModelsModal(true);
    } catch (err) {
      setError('Failed to load project models');
    }
  };

  const handleAssignModel = async (modelName: string) => {
    if (!selectedProject) return;
    try {
      await assignModel(selectedProject.id, modelName);
      const models = await listProjectModels(selectedProject.id);
      setProjectModels(models);
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign model');
    }
  };

  const handleUnassignModel = async (modelId: number) => {
    if (!selectedProject) return;
    try {
      await unassignModel(selectedProject.id, modelId);
      const models = await listProjectModels(selectedProject.id);
      setProjectModels(models);
      loadProjects();
    } catch (err) {
      setError('Failed to unassign model');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Projects</h1>
        <button className="button button-success" onClick={() => setShowCreateModal(true)}>
          + New Project
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        <div className="table-responsive projects-table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Models</th>
                <th>API Key</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.description}</td>
                  <td>
                    <span className={`badge ${project.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {project.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{project.models?.length || 0}</td>
                  <td>
                    <code style={{ fontSize: '12px' }}>{project.api_key.substring(0, 20)}...</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="button button-secondary" onClick={() => openEditModal(project)}>
                        Edit
                      </button>
                      <button className="button button-secondary" onClick={() => openModelsModal(project)}>
                        Models
                      </button>
                      <button 
                        className={`button ${project.is_active ? 'button-danger' : 'button-success'}`}
                        onClick={() => handleToggleStatus(project)}
                      >
                        {project.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="button button-danger" onClick={() => handleDelete(project)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Project</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="button button-primary" onClick={handleCreate}>
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedProject && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Project</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="button button-primary" onClick={handleEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Models Modal */}
      {showModelsModal && selectedProject && (
        <div className="modal-overlay" onClick={() => setShowModelsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Manage Models - {selectedProject.name}</h2>
              <button className="modal-close" onClick={() => setShowModelsModal(false)}>&times;</button>
            </div>
            
            <h3>Assigned Models</h3>
            {projectModels.length === 0 ? (
              <p>No models assigned yet.</p>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {projectModels.map((model) => (
                  <div key={model.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f9fafb', marginBottom: '8px', borderRadius: '6px' }}>
                    <span>{model.model_name}</span>
                    <button className="button button-danger" style={{ padding: '4px 12px' }} onClick={() => handleUnassignModel(model.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h3>Available Models</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {availableModels.map((model) => {
                const isAssigned = projectModels.some(pm => pm.model_name === model.name);
                return (
                  <button
                    key={model.name}
                    className={`button ${isAssigned ? 'button-secondary' : 'button-primary'}`}
                    onClick={() => !isAssigned && handleAssignModel(model.name)}
                    disabled={isAssigned}
                  >
                    {model.name} {isAssigned && '✓'}
                  </button>
                );
              })}
            </div>

            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setShowModelsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
