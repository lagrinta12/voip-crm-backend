import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function CreditsPage() {
  const [users, setUsers] = useState([]);
  const [pricing, setPricing] = useState({ cost_per_minute: 0.05 });
  const [topupForm, setTopupForm] = useState({ user_id: '', amount: '' });
  const [pricingForm, setPricingForm] = useState({ cost_per_minute: '' });
  const [transactions, setTransactions] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/users').then(res => setUsers(res.data)).catch(() => {});
    api.get('/admin/pricing').then(res => {
      setPricing(res.data);
      setPricingForm({ cost_per_minute: res.data.cost_per_minute });
    }).catch(() => {});
    api.get('/admin/credits').then(res => {
      const data = res.data;
      if (Array.isArray(data)) setTransactions(data);
      else if (data.transactions) setTransactions(data.transactions);
      else setTransactions([]);
    }).catch(() => setTransactions([]));
  };

  useEffect(() => { load(); }, []);

  const handleTopup = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await api.post('/admin/credits/topup', {
        user_id: parseInt(topupForm.user_id),
        amount: parseFloat(topupForm.amount),
      });
      setMsg(`Recharge effectuee. Nouveau solde: ${res.data.user?.credits || res.data.new_balance || ''} EUR`);
      setTopupForm({ user_id: '', amount: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de recharge');
    }
  };

  const handlePricing = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.put('/admin/pricing', { cost_per_minute: parseFloat(pricingForm.cost_per_minute) });
      setMsg('Tarification mise a jour');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div>
      <h1>Gestion des Credits</h1>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <h2>Recharger un compte</h2>
          <form onSubmit={handleTopup}>
            <div className="form-group">
              <label>Utilisateur</label>
              <select value={topupForm.user_id} onChange={e => setTopupForm({...topupForm, user_id: e.target.value})} required>
                <option value="">-- Choisir --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({parseFloat(u.credits||0).toFixed(2)} EUR)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Montant (EUR)</label>
              <input type="number" step="0.01" min="0.01" value={topupForm.amount} onChange={e => setTopupForm({...topupForm, amount: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-primary">Recharger</button>
          </form>
        </div>

        <div className="card">
          <h2>Tarification</h2>
          <p>Cout actuel par minute: <strong>{pricing.cost_per_minute} EUR/min</strong></p>
          <form onSubmit={handlePricing}>
            <div className="form-group">
              <label>Nouveau cout par minute (EUR)</label>
              <input type="number" step="0.001" min="0.001" value={pricingForm.cost_per_minute} onChange={e => setPricingForm({...pricingForm, cost_per_minute: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-primary">Modifier</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Soldes des comptes</h2>
        <table className="table">
          <thead>
            <tr><th>Utilisateur</th><th>Role</th><th>Solde</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td><strong>{parseFloat(u.credits||0).toFixed(2)} EUR</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Historique des transactions</h2>
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Utilisateur</th><th>Type</th><th>Montant</th><th>Solde apres</th><th>Description</th></tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucune transaction</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id}>
                <td>{new Date(t.createdAt).toLocaleString('fr-FR')}</td>
                <td>{t.User?.username || '-'}</td>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td style={{ color: t.amount > 0 ? '#10B981' : '#EF4444' }}>{t.amount > 0 ? '+' : ''}{parseFloat(t.amount).toFixed(2)} EUR</td>
                <td>{parseFloat(t.balance_after||0).toFixed(2)} EUR</td>
                <td>{t.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
