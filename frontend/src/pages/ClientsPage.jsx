import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../AuthContext';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone_number: '', email: '', company: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'admin' ? '/admin' : '';

  const load = () => {
    api.get('/clients', { params: { search } }).then(res => {
      const data = res.data;
      if (Array.isArray(data)) setClients(data);
      else if (data.clients) setClients(data.clients);
      else if (data.rows) setClients(data.rows);
      else setClients([]);
    }).catch(() => setClients([]));
  };

  useEffect(() => { load(); }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/clients', form);
      setShowForm(false);
      setForm({ name: '', phone_number: '', email: '', company: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clients</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau client'}
        </button>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate} className="form-inline">
            <input placeholder="Nom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input placeholder="Telephone" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} required />
            <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input placeholder="Societe" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
            <button type="submit" className="btn btn-primary">Creer</button>
          </form>
        </div>
      )}
      <div className="card">
        <div className="search-bar">
          <input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <table className="table">
          <thead>
            <tr><th>Nom</th><th>Telephone</th><th>Email</th><th>Societe</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucun client</td></tr>
            ) : clients.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`${basePath}/clients/${c.id}`)}>
                <td>{c.name}</td>
                <td>{c.phone_number}</td>
                <td>{c.email || '-'}</td>
                <td>{c.company || '-'}</td>
                <td><button className="btn btn-sm">Voir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
