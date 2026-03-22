import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function QueuesPage() {
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', strategy: 'roundrobin', timeout: 30, max_wait: 300 });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/queues').then(res => setQueues(Array.isArray(res.data) ? res.data : [])).catch(() => setQueues([]));
    api.get('/admin/users').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.users || [];
      setUsers(data.filter(u => u.role === 'agent'));
    }).catch(() => setUsers([]));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/queues', form);
      setShowForm(false);
      setForm({ name: '', strategy: 'roundrobin', timeout: 30, max_wait: 300 });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const addMember = async (queueId, userId) => {
    try {
      await api.post(`/admin/queues/${queueId}/members`, { user_id: userId });
      load();
    } catch (err) { alert('Erreur'); }
  };

  const removeMember = async (queueId, memberId) => {
    try {
      await api.delete(`/admin/queues/${queueId}/members/${memberId}`);
      load();
    } catch (err) { alert('Erreur'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Files d'attente</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouvelle file'}
        </button>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate} className="form-inline">
            <input placeholder="Nom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <select value={form.strategy} onChange={e => setForm({...form, strategy: e.target.value})}>
              <option value="roundrobin">Round Robin</option>
              <option value="ringall">Ring All</option>
              <option value="leastrecent">Least Recent</option>
              <option value="fewestcalls">Fewest Calls</option>
              <option value="random">Random</option>
            </select>
            <button type="submit" className="btn btn-primary">Creer</button>
          </form>
        </div>
      )}
      {queues.map(q => (
        <div className="card" key={q.id} style={{ marginBottom: 16 }}>
          <div className="page-header">
            <h3>{q.name} <span className="badge badge-info">{q.strategy}</span></h3>
          </div>
          <p>Timeout: {q.timeout}s | Max wait: {q.max_wait}s</p>
          <h4>Membres:</h4>
          {q.members && q.members.length > 0 ? (
            <ul className="member-list">
              {q.members.map(m => (
                <li key={m.id}>
                  {m.User?.username || `User #${m.user_id}`}
                  <button className="btn btn-sm btn-danger" onClick={() => removeMember(q.id, m.id)}>Retirer</button>
                </li>
              ))}
            </ul>
          ) : <p>Aucun membre</p>}
          <div style={{ marginTop: 8 }}>
            <select id={`add-member-${q.id}`} defaultValue="">
              <option value="">Ajouter un agent...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            <button className="btn btn-sm btn-success" onClick={() => {
              const sel = document.getElementById(`add-member-${q.id}`);
              if (sel.value) addMember(q.id, parseInt(sel.value));
            }}>Ajouter</button>
          </div>
        </div>
      ))}
    </div>
  );
}
