import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createGame, joinGame, ping } from '../services/api';
import { isSoundEnabled, toggleSound } from '../services/sounds';
import '../styles/home.css';

// ─── Cartes flottantes en arrière-plan ───────────────────────────────────────

const FLOAT_CARDS = [
  { left: '5%',  delay: 0,    duration: 16, r: '-14deg' },
  { left: '15%', delay: 3,    duration: 20, r: '9deg'   },
  { left: '28%', delay: 7,    duration: 13, r: '-6deg'  },
  { left: '42%', delay: 1.5,  duration: 18, r: '22deg'  },
  { left: '57%', delay: 9,    duration: 14, r: '-11deg' },
  { left: '70%', delay: 4,    duration: 19, r: '7deg'   },
  { left: '82%', delay: 6,    duration: 12, r: '-18deg' },
  { left: '92%', delay: 11,   duration: 17, r: '4deg'   },
  { left: '22%', delay: 13,   duration: 15, r: '16deg'  },
  { left: '63%', delay: 5,    duration: 21, r: '-3deg'  },
];

// ─── Menu principal ──────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { id: 'create',   label: 'Créer une partie',   icon: '🎮', color: '#e53935', screen: 'create'   },
  { id: 'join',     label: 'Rejoindre',           icon: '🔗', color: '#1e88e5', screen: 'join'     },
  { id: 'settings', label: 'Paramètres',          icon: '⚙️', color: '#78909c', screen: 'settings' },
  { id: 'exit',     label: 'Quitter',             icon: '🚪', color: '#424242', screen: null       },
];

// ─── Variants de transition (slide horizontal) ────────────────────────────────

const slideVariants = {
  initial: (dir) => ({ x: dir * 80,  opacity: 0 }),
  animate: {
    x: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
  exit: (dir) => ({
    x: dir * -60, opacity: 0,
    transition: { duration: 0.17, ease: 'easeIn' },
  }),
};

// ─── Composant principal ──────────────────────────────────────────────────────

const SESSION_KEY = 'uno-session';

export default function HomePage() {
  const navigate = useNavigate();

  const [screen,    setScreen]    = useState('menu');
  const [direction, setDirection] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [resumeSession, setResumeSession] = useState(null);
  const [soundOn,       setSoundOn]       = useState(isSoundEnabled);
  const [slowLoad,      setSlowLoad]      = useState(false);

  // Ping préventif : réveille le serveur dès l'ouverture de la page
  useEffect(() => { ping(); }, []);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s?.gameId && s?.playerId) setResumeSession(s);
    } catch {}
  }, []);

  // Champs partagés
  const [playerName,  setPlayerName]  = useState(() => localStorage.getItem('uno_name') ?? '');
  const [maxPlayers,  setMaxPlayers]  = useState(2);
  const [code,        setCode]        = useState(Array(8).fill(''));
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  // Refs pour les cases OTP
  const otpRefs = useRef([]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goTo(s) {
    setDirection(1);
    setScreen(s);
    setError('');
  }

  function goBack() {
    setDirection(-1);
    setScreen('menu');
    setError('');
  }

  // ── Clavier (menu uniquement) ───────────────────────────────────────────────

  useEffect(() => {
    if (screen !== 'menu') return;
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, MENU_ITEMS.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        const item = MENU_ITEMS[activeIdx];
        if (item.screen) goTo(item.screen);
        else handleExit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, activeIdx]);

  // Focus premier champ à l'ouverture des sous-écrans
  useEffect(() => {
    if (screen === 'join') {
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    }
  }, [screen]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const MAX_NAME = 12;

  function saveName(v) {
    const trimmed = v.slice(0, MAX_NAME);
    setPlayerName(trimmed);
    localStorage.setItem('uno_name', trimmed);
  }

  function handleExit() {
    // window.close() ne fonctionne que si la page a été ouverte par un script
    window.close();
  }

  // ── Créer ──────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!playerName.trim()) return setError('Entre ton pseudo');
    setLoading(true);
    setSlowLoad(false);
    setError('');
    const slowTimer = setTimeout(() => setSlowLoad(true), 3000);
    try {
      const game  = await createGame(maxPlayers, 'STANDARD');
      const state = await joinGame(game.gameId, playerName.trim());
      const me    = state.players.find(p => p.name === playerName.trim());
      navigate(`/lobby/${game.gameId}`, {
        state: { playerId: me?.id, gameId: game.gameId, playerName: playerName.trim(), players: state.players, maxPlayers },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      clearTimeout(slowTimer);
      setSlowLoad(false);
      setLoading(false);
    }
  }

  // ── Rejoindre ──────────────────────────────────────────────────────────────

  async function handleJoin() {
    const joinCode = code.join('');
    if (!playerName.trim())  return setError('Entre ton pseudo');
    if (joinCode.length < 8) return setError('Entre le code complet (8 caractères)');
    setLoading(true);
    setSlowLoad(false);
    setError('');
    const slowTimer = setTimeout(() => setSlowLoad(true), 3000);
    try {
      const state = await joinGame(joinCode, playerName.trim());
      const me    = state.players.find(p => p.name === playerName.trim());
      navigate(`/lobby/${joinCode}`, {
        state: { playerId: me?.id, gameId: joinCode, playerName: playerName.trim(), players: state.players },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      clearTimeout(slowTimer);
      setSlowLoad(false);
      setLoading(false);
    }
  }

  // ── OTP input ──────────────────────────────────────────────────────────────

  function handleOtpChange(e, idx) {
    const val  = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...code];
    next[idx]  = val;
    setCode(next);
    if (val && idx < 7) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(e, idx) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      const next = [...code];
      next[idx - 1] = '';
      setCode(next);
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!pasted) return;
    const next = Array(8).fill('');
    [...pasted].forEach((c, i) => { next[i] = c; });
    setCode(next);
    otpRefs.current[Math.min(pasted.length, 7)]?.focus();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="home-root">

      {/* Fond animé */}
      <div className="home-bg">
        {FLOAT_CARDS.map((c, i) => (
          <div
            key={i}
            className="home-float-card"
            style={{ left: c.left, '--r': c.r, '--delay': `${c.delay}s`, '--duration': `${c.duration}s` }}
          />
        ))}
      </div>

      {/* Contenu */}
      <div className="home-center">
        <AnimatePresence mode="wait" custom={direction}>

          {/* ── MENU ── */}
          {screen === 'menu' && (
            <motion.div
              key="menu"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="home-panel"
            >
              {/* Logo */}
              <div className="home-logo">
                {!logoError
                  ? <img src="/logo/UNO_UPJV.png" alt="UNO UPJV Edition" className="home-logo-img" onError={() => setLogoError(true)} />
                  : <span className="home-logo-text">UNO</span>
                }
              </div>

              {/* Reprendre une partie en cours */}
              {resumeSession && (
                <button
                  className="resume-btn"
                  onClick={() => navigate(`/game/${resumeSession.gameId}`)}
                >
                  ↩ Reprendre #{resumeSession.gameId}
                </button>
              )}

              {/* Items de menu */}
              <nav className="home-menu">
                {MENU_ITEMS.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className={`menu-item${activeIdx === idx ? ' menu-item--active' : ''}`}
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
                    onHoverStart={() => setActiveIdx(idx)}
                    onClick={() => item.screen ? goTo(item.screen) : handleExit()}
                  >
                    <div className="menu-item-bar" style={{ background: item.color }} />
                    <span className="menu-item-icon">{item.icon}</span>
                    <span
                      className="menu-item-text"
                      style={{ color: item.id === 'exit' ? 'rgba(255,255,255,0.35)' : 'white' }}
                    >
                      {item.label}
                    </span>
                    {item.screen && <span className="menu-item-arrow">›</span>}
                  </motion.div>
                ))}
              </nav>

              <div className="home-preview">
                <a href="/game/TESTCODE">preview jeu</a>
              </div>
            </motion.div>
          )}

          {/* ── CRÉER ── */}
          {screen === 'create' && (
            <motion.div
              key="create"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="home-panel home-panel--sub"
            >
              <PanelHeader title="Créer une partie" onBack={goBack} />
              <div className="panel-body">

                <div className="home-field">
                  <label className="home-label">Pseudo <span style={{ opacity: 0.45, fontSize: 12 }}>({playerName.length}/{MAX_NAME})</span></label>
                  <input
                    className="home-input"
                    value={playerName}
                    onChange={e => saveName(e.target.value)}
                    placeholder="Ton pseudo"
                    maxLength={MAX_NAME}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                </div>

                <div className="home-field">
                  <label className="home-label">Nombre de joueurs</label>
                  <div className="player-count-row">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`count-btn${maxPlayers === n ? ' count-btn--active' : ''}`}
                        onClick={() => setMaxPlayers(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <div className="home-error">{error}</div>}

                <button className="home-action-btn" onClick={handleCreate} disabled={loading}>
                  {loading ? (slowLoad ? '⏳ Réveil du serveur…' : 'Création…') : 'Créer la partie'}
                </button>
                {slowLoad && (
                  <p className="slow-load-hint">Cela peut prendre jusqu'à une minute.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── REJOINDRE ── */}
          {screen === 'join' && (
            <motion.div
              key="join"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="home-panel home-panel--sub"
            >
              <PanelHeader title="Rejoindre une partie" onBack={goBack} />
              <div className="panel-body">

                <div className="home-field">
                  <label className="home-label">Pseudo <span style={{ opacity: 0.45, fontSize: 12 }}>({playerName.length}/{MAX_NAME})</span></label>
                  <input
                    className="home-input"
                    value={playerName}
                    onChange={e => saveName(e.target.value)}
                    placeholder="Ton pseudo"
                    maxLength={MAX_NAME}
                  />
                </div>

                <div className="home-field">
                  <label className="home-label">Code de la partie</label>
                  <div className="otp-grid" onPaste={handleOtpPaste}>
                    {code.map((c, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        className="otp-cell"
                        maxLength={1}
                        value={c}
                        onChange={e => handleOtpChange(e, i)}
                        onKeyDown={e => handleOtpKeyDown(e, i)}
                        onFocus={e => e.target.select()}
                      />
                    ))}
                  </div>
                </div>

                {error && <div className="home-error">{error}</div>}

                <button
                  className="home-action-btn home-action-btn--blue"
                  onClick={handleJoin}
                  disabled={loading}
                >
                  {loading ? (slowLoad ? '⏳ Réveil du serveur…' : 'Connexion…') : 'Rejoindre la partie'}
                </button>
                {slowLoad && (
                  <p className="slow-load-hint">Cela peut prendre jusqu'à une minute.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── PARAMÈTRES ── */}
          {screen === 'settings' && (
            <motion.div
              key="settings"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="home-panel home-panel--sub"
            >
              <PanelHeader title="Paramètres" onBack={goBack} />
              <div className="panel-body">

                <div className="home-field">
                  <label className="home-label">Pseudo (sauvegardé) <span style={{ opacity: 0.45, fontSize: 12 }}>({playerName.length}/{MAX_NAME})</span></label>
                  <input
                    className="home-input"
                    value={playerName}
                    onChange={e => saveName(e.target.value)}
                    placeholder="Ton pseudo"
                    maxLength={MAX_NAME}
                    autoFocus
                  />
                </div>

                <div className="settings-row">
                  <span>{soundOn ? '🔊' : '🔇'} Sons</span>
                  <button
                    className={`sound-toggle${soundOn ? ' sound-toggle--on' : ''}`}
                    onClick={() => setSoundOn(toggleSound())}
                  >
                    {soundOn ? 'Activés' : 'Désactivés'}
                  </button>
                </div>
                <div className="settings-row">
                  <span>🎨 Thème des cartes</span>
                  <span>bientôt disponible</span>
                </div>
                <div className="settings-row" style={{ borderBottom: 'none' }}>
                  <span>🌐 Langue</span>
                  <span>bientôt disponible</span>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PanelHeader({ title, onBack }) {
  return (
    <div className="panel-header">
      <button className="back-btn" onClick={onBack}>← Retour</button>
      <h2 className="panel-title">{title}</h2>
    </div>
  );
}
