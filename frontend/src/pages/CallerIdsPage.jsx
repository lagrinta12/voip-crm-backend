import { useState, useEffect } from 'react';
import api from '../services/api';

export default function CallerIdsPage() {
  const [callerIds, setCallerIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone_number: '', label: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/calls/caller-ids').then(res => setCallerIds(Array.isArray(res.data) ? res.data : [])).catch(() => setCallerIds([]));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/calls/caller-ids', form);
      setShowForm(false);
      setForm({ phone_number: '', label: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const setDefault = async (id) => {
    try {
      await api.put(`/calls/caller-ids/${id}/default`);
      load();
    } catch (err) { alert('Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce caller ID ?')) return;
    try {
      await api.delete(`/calls/caller-ids/${id}`);
      load();
    } catch (err) { alert('Erreur'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Caller IDs</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate} className="form-inline">
            <input placeholder="Numero (+33...)" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} required />
            <input placeholder="Label" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
            <button type="submit" className="btn btn-primary">Ajouter</button>
          </form>
        </div>
      )}
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Numero</th><th>Label</th><th>Par defaut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {callerIds.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>Aucun caller ID</td></tr>
            ) : callerIds.map(c => (
              <tr key={c.id}>
                <td>{c.phone_number}</td>
                <td>{c.label || '-'}</td>
                <td>{c.is_default ? 'Oui' : 'Non'}</td>
                <td>
                  {!c.is_default && <button className="btn btn-sm" onClick={() => setDefault(c.id)}>Definir par defaut</button>}
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)} style={{ marginLeft: 4 }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
