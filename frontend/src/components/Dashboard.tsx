import React, { useState, useEffect } from 'react';
import { listProjects, listOllamaModels } from '../api';
import type { Project } from '../api';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ollamaModels, setOllamaModels] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [projectsData, modelsData] = await Promise.all([
        listProjects(),
        listOllamaModels(),
      ]);
      setProjects(projectsData);
      setOllamaModels(modelsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const activeProjects = projects.filter(p => p.is_active).length;
  const totalModels = ollamaModels?.models?.length || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <div className="dashboard-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 8px 0', color: '#667eea' }}>Total Projects</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>{projects.length}</p>
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 8px 0', color: '#10b981' }}>Active Projects</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>{activeProjects}</p>
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>Available Models</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>{totalModels}</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Projects</h2>
        {projects.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No projects yet. Create one to get started!</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Models</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 5).map((project) => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>
                      <span className={`badge ${project.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{project.models?.length || 0} assigned</td>
                    <td>{new Date(project.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ollamaModels?.models && (
        <div className="card">
          <h2>Available Ollama Models</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ollamaModels.models.map((model: any) => (
              <span 
                key={model.name} 
                className="badge badge-success"
              >
                {model.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
