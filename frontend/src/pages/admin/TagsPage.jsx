import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState({ name: '', color: '#3B82F6' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/tags').then(res => setTags(Array.isArray(res.data) ? res.data : [])).catch(() => setTags([]));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tags', form);
      setForm({ name: '', color: '#3B82F6' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce tag ?')) return;
    try {
      await api.delete(`/tags/${id}`);
      load();
    } catch (err) { alert('Erreur'); }
  };

  return (
    <div>
      <h1>Tags</h1>
      <div className="card" style={{ marginBottom: 24 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleCreate} className="form-inline">
          <input placeholder="Nom du tag" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          <button type="submit" className="btn btn-primary">Creer</button>
        </form>
      </div>
      <div className="card">
        <div className="tags-list">
          {tags.length === 0 ? <p>Aucun tag</p> : tags.map(tag => (
            <div key={tag.id} className="tag-item">
              <span className="tag" style={{ backgroundColor: tag.color }}>{tag.name}</span>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tag.id)}>Supprimer</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
