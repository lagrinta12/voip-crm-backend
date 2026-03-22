import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [calls, setCalls] = useState([]);
  const [noteText, setNoteText] = useState('');

  const load = () => {
    api.get(`/clients/${id}`).then(res => setClient(res.data)).catch(() => {});
    api.get(`/clients/${id}/notes`).then(res => {
      const data = res.data;
      setNotes(Array.isArray(data) ? data : data.notes || []);
    }).catch(() => setNotes([]));
    api.get(`/clients/${id}/calls`).then(res => {
      const data = res.data;
      if (Array.isArray(data)) setCalls(data);
      else if (data.calls) setCalls(data.calls);
      else setCalls([]);
    }).catch(() => setCalls([]));
  };

  useEffect(() => { load(); }, [id]);

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post(`/clients/${id}/notes`, { note_text: noteText });
      setNoteText('');
      load();
    } catch (err) { alert('Erreur'); }
  };

  if (!client) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div>
      <h1>{client.name}</h1>
      <div className="grid-2">
        <div className="card">
          <h2>Informations</h2>
          <p><strong>Telephone:</strong> {client.phone_number}</p>
          <p><strong>Email:</strong> {client.email || '-'}</p>
          <p><strong>Societe:</strong> {client.company || '-'}</p>
          <p><strong>Adresse:</strong> {client.address || '-'}</p>
          {client.tags && client.tags.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {client.tags.map(t => <span key={t.id} className="tag" style={{ backgroundColor: t.color }}>{t.name}</span>)}
            </div>
          )}
        </div>
        <div className="card">
          <h2>Notes</h2>
          <form onSubmit={addNote} style={{ marginBottom: 12 }}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ajouter une note..." rows={3} style={{ width: '100%' }} />
            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Ajouter</button>
          </form>
          {notes.length === 0 ? <p>Aucune note</p> : notes.map(n => (
            <div key={n.id} className="note-item">
              <p>{n.note_text}</p>
              <small>{n.User?.username} - {new Date(n.createdAt).toLocaleString('fr-FR')}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 24 }}>
        <h2>Historique des appels</h2>
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Direction</th><th>Duree</th><th>Statut</th><th>Agent</th></tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucun appel</td></tr>
            ) : calls.map(c => (
              <tr key={c.id}>
                <td>{new Date(c.createdAt || c.start_time).toLocaleString('fr-FR')}</td>
                <td>{c.direction === 'inbound' ? 'Entrant' : 'Sortant'}</td>
                <td>{c.duration ? `${Math.floor(c.duration / 60)}m${c.duration % 60}s` : '-'}</td>
                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                <td>{c.User?.username || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
