import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function TrunksPage() {
  const [trunks, setTrunks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', provider: '', host: '', port: 5060, username: '', password: '', transport: 'udp', max_channels: 30 });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/trunks').then(res => setTrunks(Array.isArray(res.data) ? res.data : [])).catch(() => setTrunks([]));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/trunks', form);
      setShowForm(false);
      setForm({ name: '', provider: '', host: '', port: 5060, username: '', password: '', transport: 'udp', max_channels: 30 });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.put(`/admin/trunks/${id}`, { is_active: !isActive });
      load();
    } catch (err) { alert('Erreur'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Trunks SIP</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau trunk'}
        </button>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Nouveau trunk SIP</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="form-group"><label>Nom</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>Provider</label><input value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} /></div>
              <div className="form-group"><label>Host</label><input value={form.host} onChange={e => setForm({...form, host: e.target.value})} required /></div>
              <div className="form-group"><label>Port</label><input type="number" value={form.port} onChange={e => setForm({...form, port: e.target.value})} /></div>
              <div className="form-group"><label>Username</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
              <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
              <div className="form-group"><label>Transport</label>
                <select value={form.transport} onChange={e => setForm({...form, transport: e.target.value})}>
                  <option value="udp">UDP</option><option value="tcp">TCP</option><option value="tls">TLS</option><option value="wss">WSS</option>
                </select>
              </div>
              <div className="form-group"><label>Max channels</label><input type="number" value={form.max_channels} onChange={e => setForm({...form, max_channels: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>Creer</button>
          </form>
        </div>
      )}
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Nom</th><th>Provider</th><th>Host</th><th>Transport</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {trunks.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucun trunk</td></tr>
            ) : trunks.map(t => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.provider || '-'}</td>
                <td>{t.host}:{t.port}</td>
                <td>{t.transport}</td>
                <td><span className={`badge ${t.is_active ? 'badge-success' : 'badge-danger'}`}>{t.is_active ? 'Actif' : 'Inactif'}</span></td>
                <td><button className="btn btn-sm" onClick={() => toggleActive(t.id, t.is_active)}>{t.is_active ? 'Desactiver' : 'Activer'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
