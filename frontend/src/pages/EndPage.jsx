import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leaveGame, voteRematch } from '../services/api';
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';

/**
 * Page de résultats de fin de partie.
 * Affiche le classement, permet de voter pour rejouer.
 *
 * Appels serveur :
 *   WS  /topic/game/{gameId}/{playerId} — écoute les votes rematch et l'expiration
 *   POST /rematch                       — voter pour rejouer
 *   POST /leave                         — quitter définitivement
 */
export default function EndPage() {
  const navigate   = useNavigate();
  const { gameId } = useParams();
  const { state }  = useLocation();
  const hasLeftRef = useRef(false);
  const intervalRef = useRef(null);

  const winner          = state?.winner          ?? 'Inconnu';
  const winnerId        = state?.winnerId;
  const players         = state?.players         ?? [];
  const playerId        = state?.playerId;
  const playerName      = state?.playerName;
  const humanPlayerIds  = state?.humanPlayerIds  ?? [];

  // Nombre de joueurs humains — fallback sur le total si humanPlayerIds non transmis
  const humanCount = humanPlayerIds.length > 0 ? humanPlayerIds.length : players.length;

  const winnerScore = players.find(p => p.id === winnerId)?.score ?? null;

  const [hasVoted,      setHasVoted]      = useState(false);
  const [rematchVotes,  setRematchVotes]  = useState(0);
  const [rematchNeeded, setRematchNeeded] = useState(humanCount);
  const [countdown,     setCountdown]     = useState(null); // null = pas encore démarré
  const [expired,       setExpired]       = useState(false);

  const isWinner = (p) => p.id === winnerId || p.handSize === 0;
  const isMe     = (p) => p.id === playerId;

  const sorted = [...players].sort((a, b) => {
    if (isWinner(a)) return -1;
    if (isWinner(b)) return 1;
    return a.handSize - b.handSize;
  });

  const rankEmoji = (i) => ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'][i] ?? '💀';

  // Démarre le compte à rebours de 30s vers le menu (déclenché au 1er vote rematch)
  function startCountdown() {
    if (intervalRef.current) return;
    let t = 30;
    setCountdown(t);
    intervalRef.current = setInterval(() => {
      t -= 1;
      setCountdown(t);
      if (t <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);
  }

  // ─── WebSocket — attend la reprise ou l'expiration du rematch ────────────────
  useEffect(() => {
    if (!gameId || !playerId) return;

    disconnectWebSocket();
    connectWebSocket(
      gameId,
      playerId,
      (wsState) => {
        // Mise à jour du compteur de votes
        if (wsState.rematchVotes != null) {
          setRematchVotes(wsState.rematchVotes);
          if (wsState.rematchNeeded) setRematchNeeded(wsState.rematchNeeded);
          // Démarre le countdown au 1er vote
          if (wsState.rematchVotes >= 1) startCountdown();
        }
        // Partie relancée → retour en jeu
        if (wsState.status === 'IN_PROGRESS') {
          clearInterval(intervalRef.current);
          disconnectWebSocket();
          navigate(`/game/${gameId}`, {
            state: {
              playerId,
              playerName,
              humanPlayerIds,
              initialState: wsState,
            },
          });
        }
        // Délai expiré → retour au menu
        if (wsState.rematchExpired) {
          clearInterval(intervalRef.current);
          setExpired(true);
          setTimeout(() => {
            disconnectWebSocket();
            navigate('/');
          }, 2000);
        }
      },
      () => {},
    );

    return () => {
      clearInterval(intervalRef.current);
      disconnectWebSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  // Vote pour rejouer : POST /rematch — optimistic lock local pour éviter le double-clic
  async function handleRematch() {
    if (hasVoted) return;
    setHasVoted(true);
    try {
      await voteRematch(gameId, playerId);
    } catch {
      setHasVoted(false);
    }
  }

  // Quitte la partie : arrête le WS, POST /leave, retour au menu
  async function handleLeave() {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    clearInterval(intervalRef.current);
    disconnectWebSocket();
    try { await leaveGame(gameId, playerId); } catch {}
    navigate('/');
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 20%, #1e1e3a 0%, #0f0f1a 60%, #060608 100%)',
      color: 'white',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: '32px 20px',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>

      {/* ── Trophée + titre ── */}
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
        {winnerScore != null && winnerScore > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: 'clamp(14px, 2.5vw, 18px)', color: '#a5d6a7', fontWeight: 700 }}>
            +{winnerScore} points
          </p>
        )}
      </motion.div>

      {/* ── Classement ── */}
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: win ? '#a5d6a7' : 'rgba(255,255,255,0.45)' }}>
                    {win ? '0 carte ✓' : `${p.handSize} carte${p.handSize > 1 ? 's' : ''}`}
                  </span>
                  {p.score != null && p.score > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: win ? '#ffd700' : 'rgba(255,255,255,0.3)' }}>
                      +{p.score} pts
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Barème rappel ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14, padding: '12px 20px',
          maxWidth: 'min(380px, 90vw)',
          border: '1px solid rgba(255,255,255,0.07)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.35, letterSpacing: 0.5 }}>
          Chiffres = valeur · Skip/Rev/+2 = 20 pts · Joker/+4 = 50 pts
        </div>
        <div style={{ fontSize: 11, opacity: 0.25, marginTop: 4 }}>
          Le gagnant récupère les points des mains adverses.
        </div>
      </motion.div>

      {/* ── Panneau Rejouer ── */}
      <AnimatePresence mode="wait">
        {expired ? (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}
          >
            ⏳ Délai expiré — retour au menu…
          </motion.div>
        ) : (
          <motion.div
            key="rematch-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 18, padding: '20px 28px',
              border: '1px solid rgba(255,255,255,0.1)',
              minWidth: 'min(300px, 90vw)',
            }}
          >
            {/* Compteur de votes */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, opacity: 0.45, marginBottom: 6, letterSpacing: 0.5 }}>
                Joueurs prêts à rejouer
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 3 }}>
                <span style={{ color: rematchVotes > 0 ? '#a5d6a7' : 'rgba(255,255,255,0.25)' }}>
                  {rematchVotes}
                </span>
                <span style={{ opacity: 0.3, fontSize: 24 }}> / </span>
                <span style={{ opacity: 0.55 }}>{rematchNeeded}</span>
              </div>

              {/* Barre de progression */}
              <div style={{
                marginTop: 8, height: 4, width: 120, borderRadius: 4,
                background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, #43a047, #a5d6a7)',
                  width: rematchNeeded > 0 ? `${(rematchVotes / rematchNeeded) * 100}%` : '0%',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {/* Countdown (visible dès le 1er vote) */}
            {countdown !== null && (
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: countdown <= 10 ? '#ff8a80' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.3s',
              }}>
                ⏱ {countdown}s avant retour au menu
              </div>
            )}

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleRematch}
                disabled={hasVoted}
                style={{
                  padding: '12px 26px', borderRadius: 12, border: 'none',
                  background: hasVoted
                    ? 'rgba(67,160,71,0.35)'
                    : 'linear-gradient(135deg, #43a047, #2e7d32)',
                  color: 'white', fontWeight: 900, fontSize: 15,
                  cursor: hasVoted ? 'default' : 'pointer',
                  boxShadow: hasVoted ? 'none' : '0 6px 20px rgba(67,160,71,0.4)',
                  transition: 'all 0.2s',
                  opacity: hasVoted ? 0.75 : 1,
                }}
                onMouseEnter={e => { if (!hasVoted) e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {hasVoted ? '✓ Prêt !' : '🔄 Rejouer'}
              </button>

              <button
                onClick={handleLeave}
                style={{
                  padding: '12px 22px', borderRadius: 12,
                  background: 'rgba(229,57,53,0.12)',
                  border: '1px solid rgba(229,57,53,0.35)',
                  color: 'rgba(255,120,120,0.9)', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Quitter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
