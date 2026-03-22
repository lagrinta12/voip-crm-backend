import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const adminLinks = [
    { path: '/admin', label: 'Tableau de bord', icon: '\u{1F4CA}' },
    { path: '/admin/users', label: 'Utilisateurs', icon: '\u{1F465}' },
    { path: '/admin/clients', label: 'Clients', icon: '\u{1F4CB}' },
    { path: '/admin/calls', label: 'Appels', icon: '\u{1F4DE}' },
    { path: '/admin/credits', label: 'Credits', icon: '\u{1F4B3}' },
    { path: '/admin/trunks', label: 'Trunks SIP', icon: '\u{1F310}' },
    { path: '/admin/queues', label: 'Files attente', icon: '\u{1F4E5}' },
    { path: '/admin/tags', label: 'Tags', icon: '\u{1F3F7}' },
  ];

  const agentLinks = [
    { path: '/', label: 'Dialer', icon: '\u{260E}' },
    { path: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
    { path: '/clients', label: 'Clients', icon: '\u{1F4CB}' },
    { path: '/calls', label: 'Appels', icon: '\u{1F4DE}' },
    { path: '/caller-ids', label: 'Caller IDs', icon: '\u{1F4F1}' },
  ];

  const links = isAdmin ? adminLinks : agentLinks;

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/admin' && path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const pageTitle = links.find(l => isActive(l.path))?.label || 'VoIP CRM';

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>VoIP CRM</h2>
          <span className="sidebar-role">{isAdmin ? 'Admin' : 'Agent'}</span>
        </div>
        <nav className="sidebar-nav">
          {links.map(link => (
            <button
              key={link.path}
              className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              <span className="sidebar-icon">{link.icon}</span>
              <span>{link.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span>{user?.username}</span>
            <span className="sidebar-credits">{parseFloat(user?.credits || 0).toFixed(2)} EUR</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Deconnexion</button>
        </div>
      </aside>
      <div className="main-content">
        <header className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '\u2715' : '\u2630'}
          </button>
          <span className="mobile-title">{pageTitle}</span>
          <span className="mobile-credits">{parseFloat(user?.credits || 0).toFixed(2)} EUR</span>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
