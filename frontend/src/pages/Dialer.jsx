import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../AuthContext';

export default function Dialer() {
  const { user } = useAuth();
  const [number, setNumber] = useState('');
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callerIds, setCallerIds] = useState([]);
  const [selectedCallerId, setSelectedCallerId] = useState('');
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    api.get('/calls/caller-ids').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.callerIds || [];
      setCallerIds(data);
      if (data.length > 0) {
        const def = data.find(c => c.is_default);
        setSelectedCallerId(def ? def.phone_number : data[0].phone_number);
      }
    }).catch(() => {});
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const dialPad = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
  const subLabels = { '1': '', '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ', '*': '', '0': '+', '#': '' };

  const dtmfFreqs = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
  };

  const playDTMFTone = (key) => {
    if (!dtmfFreqs[key]) return;
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine'; osc2.type = 'sine';
    osc1.frequency.value = dtmfFreqs[key][0];
    osc2.frequency.value = dtmfFreqs[key][1];
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(); osc2.start();
    osc1.stop(ctx.currentTime + 0.3); osc2.stop(ctx.currentTime + 0.3);
  };

  const pressKey = (key) => {
    playDTMFTone(key);
    if (callActive) {
      api.post('/calls/dtmf', { digit: key }).catch(() => {});
    } else {
      setNumber(prev => prev + key);
    }
  };

  const backspace = () => setNumber(prev => prev.slice(0, -1));

  const startCall = async () => {
    if (!number.trim()) return;
    try {
      setCallActive(true);
      setCallStatus('Appel en cours...');
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      const response = await api.post('/calls/initiate', { to: number, callerId: selectedCallerId || user?.phone_number });
      if (response.data.success) setCallStatus('Connect\u00e9');
      else { setCallStatus('Erreur'); setCallActive(false); clearInterval(timerRef.current); }
    } catch (error) {
      setCallStatus('Erreur: ' + (error.response?.data?.error || error.message));
      setCallActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const endCall = () => {
    setCallActive(false); setCallStatus(''); setCallDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    api.post('/calls/end').catch(() => {});
  };

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.4em', color: '#1e293b' }}>Dialer VoIP</h2>
          <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.95em', marginTop: 4 }}>
            Solde: {parseFloat(user?.credits || 0).toFixed(2)} EUR
          </div>
        </div>

        {/* Display */}
        <div style={{ background: callActive ? '#ecfdf5' : '#f8fafc', border: callActive ? '2px solid #10b981' : '2px solid #e2e8f0', borderRadius: 12, padding: '16px 12px', marginBottom: 16, textAlign: 'center', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: number.length > 12 ? '1.4em' : '2em', fontWeight: 700, color: '#1e293b', letterSpacing: 2, wordBreak: 'break-all' }}>
            {number || <span style={{ color: '#94a3b8', fontSize: '0.7em', letterSpacing: 0 }}>Entrez un num\u00e9ro</span>}
          </div>
          {callActive && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: '1.5em', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>{formatDuration(callDuration)}</span>
              <div style={{ fontSize: '0.85em', color: '#3b82f6', marginTop: 4 }}>{callStatus}</div>
            </div>
          )}
        </div>

        {/* Caller ID */}
        {!callActive && callerIds.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>ID Appelant</label>
            <select value={selectedCallerId} onChange={(e) => setSelectedCallerId(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.9em' }}>
              {callerIds.map(c => <option key={c.id} value={c.phone_number}>{c.label || c.phone_number}</option>)}
            </select>
          </div>
        )}

        {/* Dial Pad */}
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {dialPad.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {row.map(key => (
                <button key={key} onClick={() => pressKey(key)} style={{
                  padding: '14px 0', fontSize: '1.5em', fontWeight: 700, color: '#1e293b',
                  background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 12,
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                }}
                onMouseDown={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span>{key}</span>
                  {subLabels[key] && <span style={{ fontSize: '0.35em', fontWeight: 400, color: '#94a3b8', letterSpacing: 2 }}>{subLabels[key]}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button onClick={backspace} disabled={callActive} style={{ padding: '10px', fontSize: '0.85em', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: callActive ? 'not-allowed' : 'pointer', opacity: callActive ? 0.5 : 1 }}>
            Retour
          </button>
          {!callActive ? (
            <button onClick={startCall} disabled={!number.trim()} style={{ padding: '10px', fontSize: '0.85em', fontWeight: 700, background: number.trim() ? '#10b981' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, cursor: number.trim() ? 'pointer' : 'not-allowed' }}>
              Appeler
            </button>
          ) : (
            <button onClick={endCall} style={{ padding: '10px', fontSize: '0.85em', fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Raccrocher
            </button>
          )}
          <button onClick={() => setNumber('')} disabled={callActive} style={{ padding: '10px', fontSize: '0.85em', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: callActive ? 'not-allowed' : 'pointer', opacity: callActive ? 0.5 : 1 }}>
            Effacer
          </button>
        </div>

        {/* DTMF Info */}
        {callActive && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10, fontSize: '0.8em', color: '#1d4ed8', textAlign: 'center' }}>
            DTMF actif - Appuyez sur les touches pour envoyer des signaux
          </div>
        )}
      </div>
    </div>
  );
}
