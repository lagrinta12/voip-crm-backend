import { useState, useEffect } from 'react';
import api from '../services/api';

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [filter, setFilter] = useState({ direction: '', status: '' });

  const load = () => {
    const params = {};
    if (filter.direction) params.direction = filter.direction;
    if (filter.status) params.status = filter.status;
    api.get('/calls', { params }).then(res => {
      const data = res.data;
      if (Array.isArray(data)) setCalls(data);
      else if (data.calls) setCalls(data.calls);
      else if (data.rows) setCalls(data.rows);
      else setCalls([]);
    }).catch(() => setCalls([]));
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <h1>Historique des appels</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-inline">
          <select value={filter.direction} onChange={e => setFilter({...filter, direction: e.target.value})}>
            <option value="">Toutes directions</option>
            <option value="inbound">Entrant</option>
            <option value="outbound">Sortant</option>
          </select>
          <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">Tous statuts</option>
            <option value="completed">Termine</option>
            <option value="answered">Repondu</option>
            <option value="missed">Manque</option>
            <option value="failed">Echoue</option>
            <option value="busy">Occupe</option>
          </select>
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Agent</th><th>Numero</th><th>Direction</th><th>Duree</th><th>Cout</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>Aucun appel</td></tr>
            ) : calls.map(call => (
              <tr key={call.id}>
                <td>{new Date(call.createdAt || call.start_time).toLocaleString('fr-FR')}</td>
                <td>{call.User?.username || '-'}</td>
                <td>{call.called_number || '-'}</td>
                <td>{call.direction === 'inbound' ? 'Entrant' : 'Sortant'}</td>
                <td>{call.duration ? `${Math.floor(call.duration / 60)}m${call.duration % 60}s` : '-'}</td>
                <td>{parseFloat(call.cost || 0).toFixed(4)} EUR</td>
                <td><span className={`badge badge-${call.status}`}>{call.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
