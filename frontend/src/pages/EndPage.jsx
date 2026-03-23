import { useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { leaveGame } from '../services/api';

export default function EndPage() {
  const navigate     = useNavigate();
  const { gameId }   = useParams();
  const { state }    = useLocation();
  const hasLeftRef   = useRef(false);

  const winner     = state?.winner     ?? 'Inconnu';
  const winnerId   = state?.winnerId;
  const players    = state?.players    ?? [];
  const playerId   = state?.playerId;
  const playerName = state?.playerName;

  async function handleLeave() {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    try { await leaveGame(gameId, playerId); } catch {}
    navigate('/');
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white', gap: 28, padding: '24px',
    }}>

      {/* Trophée + titre */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, lineHeight: 1 }}>🏆</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 34, fontWeight: 900 }}>
          Partie terminée !
        </h1>
        <p style={{ margin: 0, fontSize: 20, opacity: 0.85 }}>
          Gagnant : <strong style={{ color: '#ffd700' }}>{winner}</strong>
        </p>
      </div>

      {/* Classement joueurs */}
      {players.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: 16,
          padding: '20px 28px', minWidth: 280,
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.5, marginBottom: 14, textTransform: 'uppercase' }}>
            Résultats
          </div>
          {players.map((p, i) => {
            const isWinner = p.id === winnerId || p.handSize === 0;
            const isMe     = p.id === playerId;
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0',
                borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
                  {isWinner ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💀'}
                </span>
                <span style={{
                  flex: 1, fontWeight: isMe ? 800 : 500,
                  color: isWinner ? '#ffd700' : 'white',
                }}>
                  {p.name}{isMe ? ' (toi)' : ''}
                </span>
                <span style={{ fontSize: 13, opacity: 0.55 }}>
                  {isWinner ? '0 carte' : `${p.handSize} carte${p.handSize > 1 ? 's' : ''}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bouton quitter */}
      <button onClick={handleLeave} style={{
        padding: '13px 40px', borderRadius: 14, border: 'none',
        background: 'linear-gradient(135deg, #e53935, #b71c1c)',
        color: 'white', fontWeight: 900, fontSize: 16,
        cursor: 'pointer', letterSpacing: 0.5,
        boxShadow: '0 6px 20px rgba(229,57,53,0.4)',
      }}>
        Quitter la partie
      </button>
    </div>
  );
}
