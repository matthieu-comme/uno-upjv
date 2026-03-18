import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, joinGame } from '../services/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('create');

  async function handleCreate() {
    if (!playerName.trim()) return setError('Entre ton pseudo');
    setLoading(true);
    setError('');
    try {
      const game = await createGame(maxPlayers, 'STANDARD');
      const state = await joinGame(game.gameId, playerName.trim());
      const me = state.players.find(p => p.name === playerName.trim());
      navigate(`/lobby/${game.gameId}`, {
        state: { playerId: me?.id, gameId: game.gameId, playerName: playerName.trim(), players: state.players },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) return setError('Entre ton pseudo');
    if (!joinCode.trim()) return setError('Entre le code de la partie');
    setLoading(true);
    setError('');
    try {
      const state = await joinGame(joinCode.trim().toUpperCase(), playerName.trim());
      const me = state.players.find(p => p.name === playerName.trim());
      navigate(`/lobby/${joinCode.trim().toUpperCase()}`, {
        state: { playerId: me?.id, gameId: joinCode.trim().toUpperCase(), playerName: playerName.trim(), players: state.players },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding: '40px 48px',
        minWidth: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        color: 'white',
      }}>
        <h1 style={{ margin: '0 0 28px', fontSize: 36, fontWeight: 900, textAlign: 'center', letterSpacing: 2 }}>
          UNO
        </h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <button style={tabBtn(tab === 'create')} onClick={() => setTab('create')}>Créer</button>
          <button style={tabBtn(tab === 'join')} onClick={() => setTab('join')}>Rejoindre</button>
        </div>

        <label style={labelStyle}>Pseudo</label>
        <input
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
          placeholder="Ton pseudo"
          style={inputStyle}
        />

        {tab === 'create' && (
          <>
            <label style={{ ...labelStyle, marginTop: 16 }}>Nombre de joueurs</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => setMaxPlayers(n)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: maxPlayers === n ? '#e53935' : 'rgba(255,255,255,0.1)',
                  color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                }}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={handleCreate} disabled={loading} style={actionBtn}>
              {loading ? 'Création...' : 'Créer la partie'}
            </button>
          </>
        )}

        {tab === 'join' && (
          <>
            <label style={{ ...labelStyle, marginTop: 16 }}>Code de la partie</label>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Ex: AB3K7X2P"
              maxLength={8}
              style={{ ...inputStyle, letterSpacing: 4, fontWeight: 700 }}
            />
            <button onClick={handleJoin} disabled={loading} style={actionBtn}>
              {loading ? 'Connexion...' : 'Rejoindre'}
            </button>
          </>
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(229,57,53,0.2)', border: '1px solid rgba(229,57,53,0.4)',
            color: '#ff8a80', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Navigation de preview (sans backend) */}
        <div style={{ marginTop: 28, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
          <div style={{ opacity: 0.4, fontSize: 11, textAlign: 'center', marginBottom: 10, letterSpacing: 1 }}>
            PREVIEW PAGES
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <a href="/lobby/TESTCODE" style={previewLink}>Lobby</a>
            <a href="/game/TESTCODE" style={previewLink}>GamePage</a>
            <a href="/end/TESTCODE" style={previewLink}>End</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const tabBtn = (active) => ({
  padding: '10px 28px', borderRadius: 10, border: 'none',
  background: active ? '#e53935' : 'rgba(255,255,255,0.1)',
  color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
});

const labelStyle = {
  display: 'block', marginBottom: 6, opacity: 0.7, fontSize: 13,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
  color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};

const previewLink = {
  padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
  border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', cursor: 'pointer',
};

const actionBtn = {
  marginTop: 24, width: '100%', padding: '12px', borderRadius: 12,
  border: 'none', background: '#e53935', color: 'white',
  fontWeight: 800, fontSize: 16, cursor: 'pointer', letterSpacing: 1,
};
