import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationProps {
  onLogout: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

// SVG Icons
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ProjectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
  </svg>
);

const TestIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
  </svg>
);

const Navigation: React.FC<NavigationProps> = ({ onLogout, isOpen = false, onToggle }) => {
  const location = useLocation();

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">Ollama API</h1>
      </div>

      <div className="sidebar-menu">
        <Link
          to="/"
          className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <span className="sidebar-icon">
            <DashboardIcon />
          </span>
          <span className="sidebar-text">Dashboard</span>
        </Link>

        <Link
          to="/projects"
          className={`sidebar-link ${location.pathname === '/projects' ? 'active' : ''}`}
        >
          <span className="sidebar-icon">
            <ProjectsIcon />
          </span>
          <span className="sidebar-text">Projects</span>
        </Link>

        <Link
          to="/test"
          className={`sidebar-link ${location.pathname === '/test' ? 'active' : ''}`}
        >
          <span className="sidebar-icon">
            <TestIcon />
          </span>
          <span className="sidebar-text">Test API</span>
        </Link>
      </div>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="error-button">
          <span className="sidebar-icon">
            <LogoutIcon />
          </span>
          <span className="sidebar-text">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
