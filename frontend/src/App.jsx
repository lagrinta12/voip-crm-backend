import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import UsersPage from './pages/admin/UsersPage';
import TrunksPage from './pages/admin/TrunksPage';
import CreditsPage from './pages/admin/CreditsPage';
import QueuesPage from './pages/admin/QueuesPage';
import TagsPage from './pages/admin/TagsPage';
import AgentDashboard from './pages/agent/AgentDashboard';
import ClientsPage from './pages/ClientsPage';
import ClientDetail from './pages/ClientDetail';
import CallsPage from './pages/CallsPage';
import Dialer from './pages/Dialer';
import CallerIdsPage from './pages/CallerIdsPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'red', background: '#fff' }}>
          <h1>Erreur de rendu</h1>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }}>
            Retour au login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <Login />} />

      {/* ADMIN DASHBOARD - /admin */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="trunks" element={<TrunksPage />} />
        <Route path="queues" element={<QueuesPage />} />
        <Route path="tags" element={<TagsPage />} />
      </Route>

      {/* AGENT/USER - / (Dialer en accueil) */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dialer />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="caller-ids" element={<CallerIdsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/') : '/login'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
