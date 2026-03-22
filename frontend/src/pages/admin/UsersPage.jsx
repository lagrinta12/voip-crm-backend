import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'agent' });
  const [error, setError] = useState('');

  const loadUsers = () => {
    api.get('/admin/users').then(res => {
      const data = res.data;
      setUsers(Array.isArray(data) ? data : data.users || []);
    }).catch(() => setUsers([]));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/users', form);
      setShowForm(false);
      setForm({ username: '', email: '', password: '', role: 'agent' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.put(`/admin/users/${id}`, { is_active: !isActive });
      loadUsers();
    } catch (err) {
      alert('Erreur');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Utilisateurs</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouvel utilisateur'}
        </button>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Nouvel utilisateur</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate} className="form-inline">
            <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
            <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            <input placeholder="Mot de passe" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="btn btn-primary">Creer</button>
          </form>
        </div>
      )}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Credits</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td>{parseFloat(u.credits || 0).toFixed(2)} EUR</td>
                <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Actif' : 'Inactif'}</span></td>
                <td>
                  <button className="btn btn-sm" onClick={() => toggleActive(u.id, u.is_active)}>
                    {u.is_active ? 'Desactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
