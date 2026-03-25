import { useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { leaveGame } from '../services/api';

// Barème officiel UNO (estimation depuis handSize uniquement)
// Ces valeurs servent à afficher une fourchette indicative
const CARD_POINT_HINT = {
  note: "Chiffres 0-9 = face · Action (Skip/Rev/+2) = 20 pts · Joker/+4 = 50 pts",
};

export default function EndPage() {
  const navigate   = useNavigate();
  const { gameId } = useParams();
  const { state }  = useLocation();
  const hasLeftRef = useRef(false);

  const winner     = state?.winner     ?? 'Inconnu';
  const winnerId   = state?.winnerId;
  const players    = state?.players    ?? [];
  const playerId   = state?.playerId;

  async function handleLeave() {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    try { await leaveGame(gameId, playerId); } catch {}
    navigate('/');
  }

  const isMe = (p) => p.id === playerId;
  const isWinner = (p) => p.id === winnerId || p.handSize === 0;

  // Trier : gagnant en premier, puis par handSize croissant
  const sorted = [...players].sort((a, b) => {
    if (isWinner(a)) return -1;
    if (isWinner(b)) return 1;
    return a.handSize - b.handSize;
  });

  const rankEmoji = (i) => ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][i] ?? '💀';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 20%, #1e1e3a 0%, #0f0f1a 60%, #060608 100%)',
      color: 'white',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28, padding: '32px 20px',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>

      {/* Trophée + titre */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 80, lineHeight: 1, filter: 'drop-shadow(0 4px 20px rgba(255,215,0,0.5))' }}>🏆</div>
        <h1 style={{ margin: '12px 0 6px', fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, letterSpacing: 1 }}>
          Partie terminée !
        </h1>
        <p style={{ margin: 0, fontSize: 'clamp(16px, 3vw, 22px)', opacity: 0.9 }}>
          Gagnant : <strong style={{ color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.6)' }}>{winner}</strong>
        </p>
      </motion.div>

      {/* Classement */}
      {sorted.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 20, padding: '20px 24px',
            minWidth: 'min(340px, 90vw)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, opacity: 0.4, marginBottom: 14, textTransform: 'uppercase' }}>
            Classement
          </div>
          {sorted.map((p, i) => {
            const win = isWinner(p);
            const me  = isMe(p);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <span style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {rankEmoji(i)}
                </span>
                <span style={{
                  flex: 1, fontWeight: me ? 800 : 500,
                  color: win ? '#ffd700' : me ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
                  fontSize: 15,
                }}>
                  {p.name}{me ? ' (toi)' : ''}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: win ? '#a5d6a7' : 'rgba(255,255,255,0.45)',
                }}>
                  {win ? '0 carte ✓' : `${p.handSize} carte${p.handSize > 1 ? 's' : ''}`}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Règle de points UNO */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14, padding: '14px 20px',
          maxWidth: 'min(380px, 90vw)',
          border: '1px solid rgba(255,255,255,0.07)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.35, marginBottom: 10, textTransform: 'uppercase' }}>
          Barème officiel UNO
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Chiffres', value: '= face', color: '#42a5f5' },
            { label: 'Skip / Rev / +2', value: '= 20 pts', color: '#ffb74d' },
            { label: 'Joker / +4', value: '= 50 pts', color: '#ef9a9a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, opacity: 0.3, marginTop: 10 }}>
          Le gagnant récupère les points des mains adverses.
        </div>
      </motion.div>

      {/* Boutons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        style={{ display: 'flex', gap: 14 }}
      >
        <button onClick={handleLeave} style={{
          padding: '13px 36px', borderRadius: 14, border: 'none',
          background: 'linear-gradient(135deg, #e53935, #b71c1c)',
          color: 'white', fontWeight: 900, fontSize: 16,
          cursor: 'pointer', letterSpacing: 0.5,
          boxShadow: '0 6px 20px rgba(229,57,53,0.4)',
          transition: 'transform 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Quitter la partie
        </button>
      </motion.div>

    </div>
  );
}
