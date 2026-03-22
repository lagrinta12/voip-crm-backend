import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalClients: 0, totalCalls: 0, totalRevenue: '0.00', totalCost: '0.00', activeTrunks: 0 });
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics').catch(() => ({ data: {} })),
      api.get('/calls?limit=10').catch(() => ({ data: { calls: [] } })),
    ]).then(([analyticsRes, callsRes]) => {
      const a = analyticsRes.data;
      setStats({
        totalUsers: a.totalUsers || 0, totalClients: a.totalClients || 0,
        totalCalls: a.totalCalls || 0, totalRevenue: a.totalRevenue || '0.00',
        totalCost: a.totalCost || '0.00', activeTrunks: a.activeTrunks || 0,
      });
      const data = callsRes.data;
      if (Array.isArray(data)) setRecentCalls(data);
      else if (data.calls) setRecentCalls(data.calls);
      else setRecentCalls([]);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div>
      <h1>Tableau de bord Admin</h1>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Utilisateurs</div></div>
        <div className="stat-card"><div className="stat-value">{stats.totalClients}</div><div className="stat-label">Clients</div></div>
        <div className="stat-card"><div className="stat-value">{stats.totalCalls}</div><div className="stat-label">Appels</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#10b981' }}>{stats.totalRevenue} EUR</div><div className="stat-label">Revenus</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: '#ef4444' }}>{stats.totalCost} EUR</div><div className="stat-label">Couts</div></div>
        <div className="stat-card"><div className="stat-value">{stats.activeTrunks}</div><div className="stat-label">Trunks actifs</div></div>
      </div>
      <div className="card" style={{ marginTop: 24 }}>
        <h2>Derniers appels</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Numero</th><th>Direction</th><th>Duree</th><th>Statut</th></tr></thead>
          <tbody>
            {recentCalls.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>Aucun appel</td></tr>
            ) : recentCalls.map(call => (
              <tr key={call.id}>
                <td>{new Date(call.createdAt || call.start_time || call.created_at).toLocaleString('fr-FR')}</td>
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
