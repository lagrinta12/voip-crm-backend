import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../AuthContext';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ today_calls: 0, total_duration: 0, answered: 0, missed: 0 });
  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    api.get('/agents/stats').then(res => setStats(res.data)).catch(() => {});
    api.get('/calls?limit=10').then(res => {
      const data = res.data;
      if (Array.isArray(data)) setRecentCalls(data);
      else if (data.calls) setRecentCalls(data.calls);
      else if (data.rows) setRecentCalls(data.rows);
      else setRecentCalls([]);
    }).catch(() => setRecentCalls([]));
  }, []);

  return (
    <div className="dashboard">
      <h1>Bonjour, {user?.username}</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.today_calls}</div>
          <div className="stat-label">Appels aujourd'hui</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.floor(stats.total_duration / 60)}m</div>
          <div className="stat-label">Duree totale</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.answered}</div>
          <div className="stat-label">Repondus</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{parseFloat(user?.credits || 0).toFixed(2)}</div>
          <div className="stat-label">Credits (EUR)</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 24 }}>
        <h2>Derniers appels</h2>
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Numero</th><th>Direction</th><th>Duree</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {recentCalls.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucun appel</td></tr>
            ) : recentCalls.map(call => (
              <tr key={call.id}>
                <td>{new Date(call.createdAt || call.start_time).toLocaleString('fr-FR')}</td>
                <td>{call.called_number || '-'}</td>
                <td>{call.direction === 'inbound' ? 'Entrant' : 'Sortant'}</td>
                <td>{call.duration ? `${Math.floor(call.duration / 60)}m${call.duration % 60}s` : '-'}</td>
                <td><span className={`badge badge-${call.status}`}>{call.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
