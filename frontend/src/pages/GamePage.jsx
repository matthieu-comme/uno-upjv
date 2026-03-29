import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Hand from "../components/Hand";
import Card from "../components/Card";
import {
  playCard as apiPlayCard,
  drawCard as apiDrawCard,
  callUno as apiCallUno,
  getGameState as apiGetGameState,
  reconnectPlayer as apiReconnectPlayer,
  leaveGame as apiLeaveGame,
} from "../services/api";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import { play, isSoundEnabled, toggleSound } from "../services/sounds";
import "../styles/game.css";


const COLOR_MAP   = { RED: "#e53935", BLUE: "#1e88e5", GREEN: "#43a047", YELLOW: "#fdd835" };
const COLOR_LABEL = { RED: "ROUGE",   BLUE: "BLEU",    GREEN: "VERT",    YELLOW: "JAUNE"   };

// ─── Normalisation backend → frontend ────────────────────────────────────────
const _C = { RED:"red", GREEN:"green", BLUE:"blue", YELLOW:"yellow", BLACK:"wild" };
const _V = {
  ZERO:"0", ONE:"1", TWO:"2", THREE:"3", FOUR:"4",
  FIVE:"5", SIX:"6", SEVEN:"7", EIGHT:"8", NINE:"9",
  SKIP:"Skip", REVERSE:"Reverse", DRAW_TWO:"+2", WILD:"Wild", WILD_DRAW_FOUR:"+4",
};

function normalizeCard(c) {
  if (!c) return null;
  return {
    id:    c.id,
    color: _C[c.color] ?? c.color?.toLowerCase() ?? "wild",
    value: _V[c.value] ?? String(c.value ?? ""),
  };
}

function normalizePlayer(p) {
  if (!p) return null;
  return {
    ...p,
    isUnoCalled: !!(p.isUnoCalled ?? p.unoCalled),
    isConnected: !!(p.isConnected ?? p.connected ?? true),
  };
}

function normalizeState(state) {
  if (!state) return null;
  return {
    ...state,
    topCard: normalizeCard(state.topCard),
    myHand:  (state.myHand ?? []).map(normalizeCard),
    players: (state.players ?? []).map(normalizePlayer),
  };
}

function isCardPlayable(card, topCard, activeColor) {
  if (!topCard) return true;
  if (card.color === "wild") return true;
  const active = (activeColor ?? topCard.color).toLowerCase();
  return card.color === active || card.value === topCard.value;
}

const SESSION_KEY = 'uno-session';

function saveSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/**
 * Page principale du jeu.
 *
 * Appels serveur :
 *   WS  /topic/game/{gameId}/{playerId} — mises à jour temps réel (état, overlays, fin de partie)
 *   GET /state/{playerId}               — récupère l'état courant (reconnexion / polling bot)
 *   POST /reconnect/{playerId}          — signale au backend le retour d'un joueur
 *   POST /play                          — jouer une carte
 *   POST /draw                          — piocher une carte
 *   POST /uno                           — annoncer UNO ou contre-UNO
 *   POST /leave                         — quitter la partie
 */
export default function GamePage() {
  const { gameId } = useParams();
  const { state: navState } = useLocation();
  const navigate = useNavigate();

  // Session : navState (navigation normale) ou localStorage (reconnexion après fermeture)
  const savedSession = useMemo(() => {
    if (navState?.playerId) return null;
    const s = loadSession();
    return s?.gameId === gameId ? s : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playerId       = navState?.playerId       ?? savedSession?.playerId;
  const isRejoining    = !navState?.playerId && !!savedSession?.playerId;

  // IDs des joueurs humains passés depuis le lobby — les autres sont des bots
  const humanPlayerIds = useMemo(
    () => new Set(navState?.humanPlayerIds ?? savedSession?.humanPlayerIds ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const isBot = (id) => humanPlayerIds.size > 0 && !humanPlayerIds.has(id);

  const [gameState, setGameState] = useState(normalizeState(navState?.initialState));
  // "connecting" | "connected" | "reconnecting:N:MAX" | "failed"
  const [wsStatus, setWsStatus] = useState("connecting");
  // { name, isMe } — visible par tout le monde quand un joueur passe à 1 carte
  const [unoOverlay, setUnoOverlay] = useState(null);
  const [ruleError, setRuleError] = useState("");
  const [notification, setNotification] = useState(null);
  const [flashSeatId, setFlashSeatId] = useState(null);
  const [colorPicker, setColorPicker] = useState(null);
  const [winnerOverlay, setWinnerOverlay] = useState(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [retryKey, setRetryKey] = useState(0);
  const [hoveredPickerColor, setHoveredPickerColor] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  // Verrou local : désactive immédiatement le bouton UNO après un clic, avant la réponse backend
  const [unoLocalLock, setUnoLocalLock] = useState(false);

  const deckRef        = useRef(null);
  const discardRef     = useRef(null);
  const handZoneRef    = useRef(null);
  const prevStateRef   = useRef(null);
  const [flyingCard, setFlyingCard] = useState(null);
  const flyingDoneRef  = useRef(null);
  const unoTimerRef    = useRef(null);
  const prevIsMyTurnRef = useRef(false);
  const [myTurnFlash, setMyTurnFlash] = useState(false);

  // ─── Flash "C'est ton tour !" au changement de tour ─────────────────────────
  useEffect(() => {
    const curId     = gameState?.players?.[gameState?.currentPlayerIndex]?.id;
    const nowMyTurn = curId === playerId && gameState?.status === "IN_PROGRESS";
    const wasMyTurn = prevIsMyTurnRef.current;
    prevIsMyTurnRef.current = nowMyTurn;
    if (nowMyTurn && !wasMyTurn) {
      play('myTurn');
      setMyTurnFlash(true);
      const t = setTimeout(() => setMyTurnFlash(false), 2000);
      return () => clearTimeout(t);
    }
    // Tour passé → on cache immédiatement
    if (!nowMyTurn && wasMyTurn) setMyTurnFlash(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerIndex, gameState?.status]);

  // ─── Countdown overlay gagnant ───────────────────────────────────────────────
  useEffect(() => {
    if (!winnerOverlay) return;
    if (winnerOverlay.countdown <= 0) {
      navigate(`/end/${gameId}`, { state: winnerOverlay.navState });
      return;
    }
    const t = setTimeout(() => {
      setWinnerOverlay(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null);
    }, 1000);
    return () => clearTimeout(t);
  }, [winnerOverlay, gameId, navigate]);

  // ─── Sauvegarde session dans localStorage (permet la reconnexion) ────────────
  useEffect(() => {
    if (!gameId || !playerId) return;
    saveSession({
      gameId,
      playerId,
      playerName:     navState?.playerName ?? savedSession?.playerName,
      humanPlayerIds: [...humanPlayerIds],
    });
  }, [gameId, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helper partagé : reconnexion + récupération d'état ─────────────────────
  // Utilisé lors : (1) retour après fermeture onglet, (2) reconnexion WS, (3) bouton Réessayer
  function refreshGameState() {
    apiReconnectPlayer(gameId, playerId).catch(() => {});
    apiGetGameState(gameId, playerId)
      .then(s => { if (s) setGameState(normalizeState(s)); })
      .catch(() => {});
  }

  // ─── Reconnexion automatique si retour après fermeture onglet ────────────────
  useEffect(() => {
    if (!isRejoining || !gameId || !playerId) return;
    refreshGameState();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !playerId) return;
    connectWebSocket(
      gameId,
      playerId,
      (state) => {
        setGameState(normalizeState(state));

        const isFinished = state.status === "FINISHED"
          || (state.status === "IN_PROGRESS" && state.players?.some(p => p.handSize === 0));

        if (isFinished) {
          disconnectWebSocket();
          clearSession();
          const w = state.players?.find(p => p.handSize === 0)
                 ?? state.players?.[state.currentPlayerIndex];
          const endNavState = {
            winner:          w?.name ?? "Inconnu",
            winnerId:        w?.id,
            players:         state.players,
            playerId,
            playerName:      navState?.playerName ?? savedSession?.playerName,
            gameId,
            humanPlayerIds:  [...humanPlayerIds],
          };
          play('win');
          setWinnerOverlay({ name: w?.name ?? "Inconnu", countdown: 10, navState: endNavState });
        }
      },
      (status, attempt, max) => {
        if (status === 'connected' || status === 'reconnected') {
          setWsStatus("connected");
          // WS rétabli après coupure : resynchronise l'état
          if (status === 'reconnected') {
            refreshGameState();
          }
        } else if (status === 'reconnecting') {
          setWsStatus(`reconnecting:${attempt}:${max}`);
        } else if (status === 'failed' || status === 'error') {
          setWsStatus("failed");
        }
      }
    );
    return () => disconnectWebSocket();
  }, [gameId, playerId, navigate, retryKey]);

  // ─── Polling fallback quand c'est le tour d'un bot ───────────────────────────
  // Le bot joue côté serveur mais ne pousse pas toujours de WS update rapide.
  // On poll GET /state/{playerId} toutes les 2s uniquement quand un bot joue.
  useEffect(() => {
    if (!gameId || !playerId) return;
    const currentPlayerId = gameState?.players?.[gameState?.currentPlayerIndex]?.id;
    const botIsPlaying = currentPlayerId && isBot(currentPlayerId) && gameState?.status === "IN_PROGRESS";
    if (!botIsPlaying) return;

    const interval = setInterval(async () => {
      try {
        const state = await apiGetGameState(gameId, playerId);
        if (state) setGameState(normalizeState(state));
      } catch {
        // silencieux — le WS prend le relais si disponible
      }
    }, 2000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerIndex, gameState?.status, gameId, playerId]);

  // ─── Timer de tour (30 s) ────────────────────────────────────────────────────
  // NOTE : status et isMyTurn ne sont pas encore déclarés ici → on lit gameState directement
  const TURN_DURATION = 30;

  useEffect(() => {
    const s = gameState?.status ?? "WAITING_FOR_PLAYERS";
    if (s !== "IN_PROGRESS") { setTurnTimeLeft(TURN_DURATION); return; }
    setTurnTimeLeft(TURN_DURATION);
    const iv = setInterval(() => setTurnTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerIndex, gameState?.status]);

  useEffect(() => {
    const s         = gameState?.status ?? "WAITING_FOR_PLAYERS";
    const curId     = gameState?.players?.[gameState?.currentPlayerIndex]?.id;
    const myTurn    = curId === playerId;
    if (turnTimeLeft === 0 && s === "IN_PROGRESS" && myTurn) {
      apiDrawCard(gameId, playerId).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnTimeLeft]);

  // ─── Détection des événements de jeu ────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return;
    const prev = prevStateRef.current;

    if (prev) {
      const prevCurrentId = prev.players?.[prev.currentPlayerIndex]?.id;
      const currCurrentId = gameState.players?.[gameState.currentPlayerIndex]?.id;
      const newTopCard    = gameState.topCard;
      const oldTopCard    = prev.topCard;

      // Nouvelle carte posée
      if (newTopCard?.id !== oldTopCard?.id) {
        const cardCountDiff = (gameState.myHand?.length ?? 0) - (prev.myHand?.length ?? 0);

        if (newTopCard?.value === "+2" && cardCountDiff >= 2) {
          play('penalty');
          showNotification("💀 Tu dois piocher 2 cartes !", 3000);
        } else if (newTopCard?.value === "+4" && cardCountDiff >= 4) {
          play('penalty');
          showNotification("💀 Tu dois piocher 4 cartes !", 3000);
        } else if (newTopCard?.value === "Skip") {
          const n       = prev.players.length;
          const prevDir = prev.direction ?? 1;
          const nextIdx = (prev.currentPlayerIndex + prevDir + n) % n;
          if (prev.players[nextIdx]?.id === playerId) {
            showNotification("⛔ Ton tour est passé !", 2500);
          }
        }

        // Animation : carte de l'adversaire qui vient d'être posée
        if (prevCurrentId && prevCurrentId !== playerId) {
          const seatEl = document.querySelector(`[data-player-id="${prevCurrentId}"] .opponent-cards`);
          if (seatEl && discardRef.current) {
            animateCard(newTopCard, seatEl, discardRef.current, () => {}, false);
          }
        }
      }

      // Flash siège du nouveau joueur actif
      if (currCurrentId && currCurrentId !== prevCurrentId && currCurrentId !== playerId) {
        setFlashSeatId(currCurrentId);
        setTimeout(() => setFlashSeatId(null), 900);
      }

      // Overlay UNO : déclenché uniquement quand isUnoCalled passe à true (bouton pressé)
      // isUnoCalled est dans le broadcast → visible sur TOUS les écrans simultanément
      for (const p of gameState.players ?? []) {
        const prevP = prev.players?.find(q => q.id === p.id);
        if (p.isUnoCalled && prevP && !prevP.isUnoCalled) {
          play('uno');
          clearTimeout(unoTimerRef.current);
          setUnoOverlay({ name: p.name, isMe: p.id === playerId });
          unoTimerRef.current = setTimeout(() => setUnoOverlay(null), 2200);
          break;
        }
      }

      // Overlay Contre-UNO : même mécanisme — handSize 1→3 (pénalité appliquée)
      for (const p of gameState.players ?? []) {
        const prevP = prev.players?.find(q => q.id === p.id);
        if (prevP && prevP.handSize === 1 && p.handSize === 3) {
          play('counterUno');
          clearTimeout(unoTimerRef.current);
          setUnoOverlay({ name: p.name, isMe: false, isCounter: true });
          unoTimerRef.current = setTimeout(() => setUnoOverlay(null), 2200);
          break;
        }
      }

      // Notification quand c'est le tour d'un bot (changement de joueur actif)
      const prevCurrentPlayer = prev.players?.[prev.currentPlayerIndex];
      const newCurrentPlayer  = gameState.players?.[gameState.currentPlayerIndex];
      if (
        newCurrentPlayer &&
        newCurrentPlayer.id !== prevCurrentPlayer?.id &&
        isBot(newCurrentPlayer.id)
      ) {
        showNotification(`🤖 ${newCurrentPlayer.name} réfléchit…`, 2000);
      }
    }

    prevStateRef.current = gameState;
  }, [gameState, playerId]);

  // ─── Dérivations ─────────────────────────────────────────────────────────────
  const myHand        = gameState?.myHand ?? [];
  const topCard       = gameState?.topCard ?? null;
  const players       = gameState?.players ?? [];
  const currentPlayer = players[gameState?.currentPlayerIndex];
  const isMyTurn      = currentPlayer?.id === playerId;
  const status        = gameState?.status ?? "WAITING_FOR_PLAYERS";
  const activeColor   = gameState?.activeColor;
  const direction     = gameState?.direction ?? 1;
  const deckSize      = gameState?.deckSize ?? 0;

  // Décodage wsStatus reconnexion
  const isReconnecting = wsStatus.startsWith("reconnecting:");
  const isFailed       = wsStatus === "failed";
  const reconnectParts = isReconnecting ? wsStatus.split(":") : [];
  const reconnectAttempt = reconnectParts[1] ? parseInt(reconnectParts[1]) : 0;
  const reconnectMax     = reconnectParts[2] ? parseInt(reconnectParts[2]) : 5;

  // Adversaires ayant 1 carte sans UNO annoncé → source de vérité : backend
  const myPlayerData      = players.find(p => p.id === playerId);
  const counterUnoTargets = useMemo(
    () => players.filter(p => p.id !== playerId && p.handSize === 1 && !p.isUnoCalled),
    [players, playerId]
  );

  // Placement des adversaires en sens horaire depuis ma position dans la liste
  const seats = useMemo(() => {
    const posMap   = { 1: ["top"], 2: ["left", "right"], 3: ["left", "top", "right"] };
    const opponents = players.filter(p => p.id !== playerId);
    const positions = posMap[opponents.length] ?? ["top"];

    const n     = players.length;
    const myIdx = players.findIndex(p => p.id === playerId);
    const ordered = [];
    for (let step = 1; step < n && ordered.length < opponents.length; step++) {
      const p = players[(myIdx + step) % n];
      if (p && p.id !== playerId) ordered.push(p);
    }

    return ordered.map((p, i) => ({ pos: positions[i] ?? "top", p }));
  }, [players, playerId]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function showError(msg) {
    play('error');
    setRuleError(msg);
    setTimeout(() => setRuleError(""), 2500);
  }

  function showNotification(text, duration = 2500) {
    setNotification(text);
    setTimeout(() => setNotification(null), duration);
  }

  // Bouton "Réessayer" après échec total de connexion WS
  function handleRetry() {
    setWsStatus("connecting");
    setRetryKey(k => k + 1); // force le useEffect WebSocket à se réexécuter
    refreshGameState();
  }

  function rectOf(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  function animateCard(card, fromEl, toEl, onDone, faceDown = false) {
    const from = rectOf(fromEl);
    const to   = rectOf(toEl);
    if (!from || !to) { onDone?.(); return; }
    setFlyingCard({ card, faceDown, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });
    flyingDoneRef.current = onDone;
  }

  // ─── Jouer une carte ─────────────────────────────────────────────────────────
  // Vérifie la jouabilité localement avant d'envoyer POST /play.
  // Si la carte est un joker, ouvre le sélecteur de couleur d'abord.
  async function handlePlayCard(card, sourceEl) {
    if (!isMyTurn) return;

    if (!isCardPlayable(card, topCard, activeColor)) {
      showError("Cette carte ne peut pas être jouée !");
      return;
    }

    if (card.color === "wild") {
      setColorPicker({ card, sourceEl });
      return;
    }

    await executePlayCard(card, sourceEl, null);
  }

  async function executePlayCard(card, sourceEl, chosenColor) {
    try {
      play('playCard');
      animateCard(card, sourceEl, discardRef.current, () => {});
      await apiPlayCard(gameId, playerId, card.id, chosenColor);
    } catch (e) {
      showError(e.message);
    }
  }

  // ─── Piocher une carte ───────────────────────────────────────────────────────
  // Déclenche l'animation volante + POST /draw. Aussi appelé automatiquement à 0s de timer.
  function handleDraw() {
    if (!isMyTurn) return;

    // Animation : carte dos volante depuis la pioche vers la main
    const deckEl   = deckRef.current;
    const from     = rectOf(deckEl);
    const handZone = rectOf(handZoneRef.current);

    if (from && handZone) {
      const to = { x: handZone.x + handZone.w / 2 - 39, y: handZone.y + 20, w: 78, h: 112 };
      setFlyingCard({ card: { color: "wild", value: "" }, faceDown: true, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });
      flyingDoneRef.current = null;
    }

    play('drawCard');
    apiDrawCard(gameId, playerId).catch(e => showError(e.message));
  }

  // ─── UNO & Contre-UNO ────────────────────────────────────────────────────────
  // Un seul endpoint. Backend décide : 1 carte → UNO annoncé, sinon → contre-UNO.
  // L'overlay est déclenché UNIQUEMENT par le broadcast WS → visible sur tous les écrans.
  function handleUno() {
    if (unoLocalLock || myHand.length !== 1 || myPlayerData?.isUnoCalled) return;
    setUnoLocalLock(true);
    apiCallUno(gameId, playerId).catch(() => {});
  }

  function handleCounterUno() {
    if (unoLocalLock || counterUnoTargets.length === 0) return;
    setUnoLocalLock(true);
    apiCallUno(gameId, playerId).catch(() => {});
  }

  // ─── Raccourci clavier sélecteur couleur (1-4) ───────────────────────────────
  useEffect(() => {
    if (!colorPicker) return;
    const options = [
      { key: "RED",    hex: "#e53935" },
      { key: "BLUE",   hex: "#1e88e5" },
      { key: "GREEN",  hex: "#43a047" },
      { key: "YELLOW", hex: "#fdd835" },
    ];
    function onKey(e) {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < options.length) {
        play('colorChosen');
        const { card, sourceEl } = colorPicker;
        setColorPicker(null);
        setHoveredPickerColor(null);
        executePlayCard(card, sourceEl, options[idx].key);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorPicker]);

  // ─── Reset verrou UNO quand le tour change (action traitée par le backend) ────
  useEffect(() => {
    setUnoLocalLock(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerIndex]);

  // ─── Raccourci clavier UNO / Contre-UNO ──────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'u' && e.key !== 'U') return;
      if (document.activeElement?.tagName === 'INPUT') return;
      e.preventDefault();
      if (counterUnoTargets.length > 0) handleCounterUno();
      else handleUno();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterUnoTargets, myHand, myPlayerData]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  // Couleur effective : activeColor (joker) ou couleur de la topCard (carte normale)
  const _normToKey = { red: "RED", blue: "BLUE", green: "GREEN", yellow: "YELLOW" };
  const effectiveColorKey = activeColor ?? (topCard?.color ? _normToKey[topCard.color] : null);
  const activeColorHex    = COLOR_MAP[effectiveColorKey] ?? null;
  const discardTint       = (topCard?.color === "wild" && activeColorHex) ? activeColorHex : null;

  return (
    <div className="game-root">

      {/* ── Overlay couleur active (ambiance) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: activeColorHex ?? "transparent",
          opacity: activeColorHex ? 0.13 : 0,
          transition: "background 0.6s ease, opacity 0.6s ease",
        }}
      />

      {/* ── Fond animé d'ambiance ── */}
      <div className="game-bg" aria-hidden="true">
        {/* Orbes colorés fixes */}
        <div className="game-bg-orb orb-1" />
        <div className="game-bg-orb orb-2" />
        <div className="game-bg-orb orb-3" />
        <div className="game-bg-orb orb-4" />
        <div className="game-bg-orb orb-5" />
        <div className="game-bg-orb orb-6" />
        {/* Orbes dynamiques — couleur active (même effet que le color picker) */}
        {[
          { top: '-25%', left: '-18%', width: '800px', height: '800px', o: 0.38 },
          { bottom: '-22%', right: '-18%', width: '700px', height: '700px', o: 0.32 },
          { top: '15%', right: '-8%', width: '500px', height: '500px', o: 0.26 },
          { bottom: '12%', left: '6%', width: '450px', height: '450px', o: 0.22 },
        ].map(({ o, ...pos }, i) => (
          <div key={`dyn-${i}`} style={{
            position: 'absolute', borderRadius: '50%',
            filter: 'blur(100px)',
            background: activeColorHex ?? '#07071a',
            opacity: activeColorHex ? o : 0,
            transition: 'background 0.8s ease, opacity 0.8s ease',
            pointerEvents: 'none', willChange: 'opacity',
            ...pos,
          }} />
        ))}
        {/* Mini-cartes flottantes */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`game-bg-card bgcard-${i}`} />
        ))}
        {/* Grille de points */}
        <div className="game-bg-grid" />
        {/* Vignette */}
        <div className="game-bg-vignette" />
      </div>

      {/* ── Top bar ── */}
      <header className="game-topbar">
        <h2 className="game-title">#{gameId}</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Couleur active */}
          {activeColor && status === "IN_PROGRESS" && (
            <div className="topbar-color-pill">
              <div className="topbar-color-dot" style={{ background: activeColorHex, boxShadow: `0 0 8px ${activeColorHex}` }} />
              <span className="topbar-color-label">{COLOR_LABEL[activeColor] ?? activeColor}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPlayer?.id ?? "none"}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className={`turn-pill${isMyTurn ? " my-turn" : ""}`}
            >
              {status === "IN_PROGRESS"
                ? (isMyTurn
                    ? "🎯 C'est ton tour !"
                    : currentPlayer && isBot(currentPlayer.id)
                      ? `🤖 ${currentPlayer.name} joue…`
                      : `Tour de ${currentPlayer?.name ?? "..."}`)
                : status === "WAITING_FOR_PLAYERS" ? `⏳ En attente… (${players.length})`
                : "🏆 Terminé"
              }
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setSoundOn(toggleSound())}
            title={soundOn ? "Couper le son" : "Activer le son"}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 999, padding: "4px 10px", cursor: "pointer",
              fontSize: 14, lineHeight: 1, color: "white",
              opacity: soundOn ? 1 : 0.45,
            }}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>

          {status === "IN_PROGRESS" && (
            <button
              onClick={() => setShowQuitConfirm(true)}
              title="Quitter la partie"
              style={{
                background: "rgba(229,57,53,0.15)", border: "1px solid rgba(229,57,53,0.35)",
                borderRadius: 999, padding: "4px 12px", cursor: "pointer",
                fontSize: 12, fontWeight: 700, color: "rgba(255,120,120,0.9)",
                letterSpacing: 0.5,
              }}
            >
              Quitter
            </button>
          )}

          <div style={{
            fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: wsStatus === "connected" ? "rgba(67,160,71,0.3)"
                      : isFailed               ? "rgba(229,57,53,0.3)"
                      : isReconnecting         ? "rgba(255,152,0,0.3)"
                      : "rgba(255,255,255,0.1)",
            color: wsStatus === "connected" ? "#a5d6a7"
                 : isFailed               ? "#ff8a80"
                 : isReconnecting         ? "#ffcc80"
                 : "#ccc",
          }}>
            {wsStatus === "connected" ? "● Connecté"
           : isFailed               ? "● Hors ligne"
           : isReconnecting         ? `↻ Reconnexion… (${reconnectAttempt}/${reconnectMax})`
           : "○ Connexion…"}
          </div>
        </div>

        {/* ── Barre de timer — positionnée en bas du topbar, ne perturbe pas le grid ── */}
        {status === "IN_PROGRESS" && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              width: `${(turnTimeLeft / TURN_DURATION) * 100}%`,
              background: turnTimeLeft > 15
                ? "linear-gradient(90deg, #43a047, #66bb6a)"
                : turnTimeLeft > 7
                ? "linear-gradient(90deg, #f9a825, #fdd835)"
                : "linear-gradient(90deg, #e53935, #ef5350)",
              transition: "width 1s linear, background 0.5s ease",
              boxShadow: turnTimeLeft <= 7 ? "0 0 8px rgba(229,57,53,0.7)" : "none",
            }} />
            {isMyTurn && turnTimeLeft <= 10 && (
              <div style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                fontSize: 9, fontWeight: 900, lineHeight: 1,
                color: turnTimeLeft <= 7 ? "#ff8a80" : "#ffe082",
              }}>
                {turnTimeLeft}s
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Table ── */}
      <main className="table-container">
        <div className="board-shell">

          {/* Sièges adversaires (sens horaire depuis ma position dans players[]) */}
          {seats.map(({ pos, p }) => {
            const isActive = currentPlayer?.id === p.id;
            const isFlash  = flashSeatId === p.id;
            return (
              <div
                key={p.id}
                data-player-id={p.id}
                className={`seat ${pos}${isActive ? " active" : ""}${isFlash ? " flash" : ""}${!p.isConnected ? " disconnected" : ""}`}
              >
                <div className="opponent-mini">
                  <div className="opponent-cards">
                    {Array.from({ length: Math.max(p.handSize, 1) }).map((_, i) => (
                      <div key={i} className={`opponent-card-back ${pos}`} style={{ "--i": i, "--count": p.handSize }} />
                    ))}
                  </div>
                  <div className="opponent-label">
                    {isBot(p.id) && <span className="bot-badge">🤖</span>}
                    {p.name}
                    {!p.isConnected && !isBot(p.id) && <span className="disconnected-badge"> 📡</span>}
                    {p.isUnoCalled && <span className="uno-badge"> 🛡️</span>}
                    {isActive && <span className="turn-arrow"> ▶</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Table verte */}
          <section className="table">

            {/* Flèches de direction orbitant autour du centre */}
            {status === "IN_PROGRESS" && (
              <svg
                className={`direction-orbit direction-orbit--${direction === 1 ? 'cw' : 'ccw'}`}
                viewBox="0 0 340 340" /* ← taille totale du SVG : centre = moitié = 170 */
                width="340" height="340" /* ← même valeur que viewBox */
                aria-hidden="true"
              >
                {/* Anneau guide très subtil */}
                <circle cx="170" cy="170" r="148" /* ← cx/cy = moitié de viewBox | r = rayon de l'orbite */
                  fill="none"
                  stroke={activeColorHex ?? "rgba(255,255,255,1)"}
                  strokeOpacity="0.07"
                  strokeWidth="1.5"
                  strokeDasharray="6 10"
                  style={{ transition: "stroke 0.8s ease" }}
                />
                {/* 3 flèches chevron espacées de 120° */}
                {[0, 120, 240].map(deg => {
                  const rad = (deg - 90) * Math.PI / 180;
                  const x = 170 + 148 * Math.cos(rad); /* ← 170 = cx/cy | 148 = même r que le cercle */
                  const y = 170 + 148 * Math.sin(rad);
                  const arrowRot = direction === 1 ? deg : deg + 180;
                  return (
                    <text key={deg}
                      x={x} y={y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize="50" fontWeight="1000" /* ← taille des flèches — modifie cette valeur */
                      fill={activeColorHex ?? "white"}
                      fillOpacity="0.5"
                      transform={`rotate(${arrowRot}, ${x}, ${y})`}
                      style={{ transition: "fill 0.8s ease" }}
                    >›</text>
                  );
                })}
              </svg>
            )}

            {/* Centre : pioche + défausse */}
            <div className="table-center-zone">

              {/* Pioche (cliquable) */}
              <div
                ref={deckRef}
                className={`draw-pile${isMyTurn ? " hoverable" : ""}`}
                onClick={handleDraw}
                title={isMyTurn ? "Piocher une carte" : undefined}
              >
                <div className="draw-stack-visual">
                  <div className="stack-card-bg" style={{ transform: "translate(-3px,-3px)" }} />
                  <div className="stack-card-bg" style={{ transform: "translate(-1px,-1px)" }} />
                  <div className="draw-card-small">
                    <Card card={{ color: "wild", value: "" }} faceDown />
                  </div>
                </div>
                <div className="deck-count-label">{deckSize} carte{deckSize !== 1 ? "s" : ""}</div>
              </div>

              {/* Défausse */}
              <div
                className="discard-pile"
                ref={discardRef}
                style={activeColorHex ? {
                  filter: `drop-shadow(0 0 18px ${activeColorHex}99)`,
                  transition: "filter 0.5s ease",
                } : undefined}
              >
                {topCard
                  ? <Card card={topCard} tintColor={discardTint} />
                  : <div style={{ width: 78, height: 112, borderRadius: 14, border: "2px dashed rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>vide</div>
                }
              </div>

            </div>

            {/* Bouton UNO / Contre-UNO — même bouton, comportement contextuel */}
            {status === "IN_PROGRESS" && (() => {
              const counterTarget  = counterUnoTargets[0];
              const canUno         = myHand.length === 1 && !myPlayerData?.isUnoCalled;
              const someoneProtected = players.some(p => p.isUnoCalled);
              const isActive         = (counterTarget != null || canUno) && !someoneProtected && !unoLocalLock;
              return (
                <button
                  className={`table-uno-btn${isActive ? " active" : ""}`}
                  disabled={!isActive}
                  title={counterTarget ? `Contre-UNO sur ${counterTarget.name} [U]` : "Annoncer UNO [U]"}
                  onClick={() => counterTarget ? handleCounterUno() : handleUno()}
                >
                  {counterTarget ? `Contre ! ${counterTarget.name}` : "UNO !"}
                  {isActive && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6, fontWeight: 700 }}>[U]</span>}
                </button>
              );
            })()}

          </section>
        </div>
      </main>

      {/* ── Main du joueur ── */}
      <section
        className={`player-hand-zone${isMyTurn ? " my-turn" : ""}`}
        ref={handZoneRef}
        style={isMyTurn && activeColorHex ? { '--turn-color': activeColorHex } : undefined}
      >
        <AnimatePresence>
          {myTurnFlash && (
            <motion.div
              key="my-turn-flash"
              className="hand-turn-flash"
              initial={{ opacity: 0, y: 14, scale: 0.88 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
            >
              ▶ C'est ton tour !
            </motion.div>
          )}
        </AnimatePresence>
        {myHand.length > 0
          ? <Hand cards={myHand} onPlayCard={isMyTurn ? handlePlayCard : undefined} />
          : <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: "20px" }}>
              {status === "WAITING_FOR_PLAYERS" ? "En attente du début de la partie..." : "Aucune carte"}
            </div>
        }

        {/* Badge compteur de cartes */}
        {status === "IN_PROGRESS" && myHand.length > 0 && (
          <div style={{
            position: "absolute", bottom: 14, left: 18,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${activeColorHex ? activeColorHex + "44" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 999, padding: "4px 12px",
            backdropFilter: "blur(6px)", pointerEvents: "none",
            transition: "border-color 0.6s ease",
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>🃏</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "white", lineHeight: 1 }}>
              {myHand.length}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: 0.5 }}>
              carte{myHand.length > 1 ? "s" : ""}
            </span>
            {myPlayerData?.isUnoCalled && (
              <span style={{ fontSize: 14, lineHeight: 1 }} title="UNO annoncé — tu es protégé">🛡️</span>
            )}
          </div>
        )}
      </section>


      {/* ── Toast erreur règles ── */}
      <AnimatePresence>
        {ruleError && (
          <motion.div
            key="rule-error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              position: "fixed", bottom: 110, left: "50%", transform: "translateX(-50%)",
              background: "rgba(200,30,30,0.92)", color: "white", padding: "10px 22px",
              borderRadius: 12, zIndex: 500, fontWeight: 700, fontSize: 14,
              border: "1px solid rgba(255,120,120,0.4)", whiteSpace: "nowrap",
            }}
          >
            {ruleError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Notification ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key="notification"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(20,20,20,0.92)",
              color: "white", padding: "18px 36px",
              borderRadius: 18, zIndex: 800, fontWeight: 800, fontSize: 22,
              border: "2px solid rgba(229,57,53,0.6)",
              boxShadow: "0 0 40px rgba(229,57,53,0.4)",
              textAlign: "center", pointerEvents: "none",
            }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay UNO ! (visible par tous les joueurs) ── */}
      <AnimatePresence>
        {unoOverlay && (
          <motion.div
            key="uno-overlay"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            style={{
              position: "fixed", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 9000, pointerEvents: "none", gap: 8,
            }}
          >
            <span style={{
              fontSize: "clamp(80px, 18vw, 180px)", fontWeight: 900, color: "#e53935",
              textShadow: "0 0 40px rgba(229,57,53,0.9), 0 0 80px rgba(229,57,53,0.5), 5px 5px 0 #000",
              letterSpacing: 10, WebkitTextStroke: "3px #fff", lineHeight: 1,
            }}>
              UNO!
            </span>
            {!unoOverlay.isMe && (
              <span style={{
                fontSize: "clamp(18px, 4vw, 32px)", fontWeight: 800,
                color: "rgba(255,255,255,0.9)",
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                letterSpacing: 2,
              }}>
                {unoOverlay.isCounter ? `💀 Contre-UNO sur ${unoOverlay.name} !` : `${unoOverlay.name} a dit UNO !`}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bannière reconnexion (non bloquante) ── */}
      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            key="reconnecting-banner"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: "fixed", top: "calc(var(--topbar-height, 56px) + 8px)",
              left: "50%", transform: "translateX(-50%)",
              background: "rgba(255,152,0,0.92)", color: "#1a0800",
              padding: "9px 22px", borderRadius: 12, zIndex: 9200,
              fontWeight: 800, fontSize: 13, letterSpacing: 0.5,
              border: "1px solid rgba(255,200,80,0.6)",
              boxShadow: "0 4px 16px rgba(255,152,0,0.4)",
              pointerEvents: "none", whiteSpace: "nowrap",
            }}
          >
            ↻ Reconnexion en cours… ({reconnectAttempt}/{reconnectMax})
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay échec de connexion (bloquant) ── */}
      <AnimatePresence>
        {isFailed && (
          <motion.div
            key="failed-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.88)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 9800, gap: 20,
            }}
          >
            <div style={{ fontSize: 64 }}>📡</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "white", textAlign: "center" }}>
              Connexion perdue
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", textAlign: "center", maxWidth: 320 }}>
              Impossible de se reconnecter après {reconnectMax} tentatives.
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                onClick={handleRetry}
                style={{
                  padding: "12px 32px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, #1e88e5, #1565c0)",
                  color: "white", fontWeight: 900, fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(30,136,229,0.4)",
                }}
              >
                ↻ Réessayer
              </button>
              <button
                onClick={() => { clearSession(); navigate("/"); }}
                style={{
                  padding: "12px 32px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, #e53935, #b71c1c)",
                  color: "white", fontWeight: 900, fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(229,57,53,0.4)",
                }}
              >
                Accueil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay Victoire ── */}
      <AnimatePresence>
        {winnerOverlay && (
          <motion.div
            key="winner-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.82)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 9500, gap: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.1 }}
              style={{ textAlign: "center" }}
            >
              <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 8 }}>🏆</div>
              <div style={{
                fontSize: "clamp(36px, 8vw, 72px)", fontWeight: 900, color: "#ffd700",
                textShadow: "0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.4), 4px 4px 0 rgba(0,0,0,0.6)",
                letterSpacing: 4, WebkitTextStroke: "2px rgba(255,255,255,0.3)",
              }}>
                {winnerOverlay.name}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: 10, letterSpacing: 1 }}>
                a remporté la partie !
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, color: "white", fontVariantNumeric: "tabular-nums", textShadow: "0 0 30px rgba(255,255,255,0.4)" }}>
                {winnerOverlay.countdown}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>
                Résultats dans {winnerOverlay.countdown}s
              </div>
              <button
                onClick={() => navigate(`/end/${gameId}`, { state: winnerOverlay.navState })}
                style={{
                  marginTop: 8, padding: "10px 28px", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.12)",
                  color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >
                Voir les résultats →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sélecteur couleur wild ── */}
      {colorPicker && (() => {
        const pickerColors = [
          { key: "RED",    hex: "#e53935", label: "Rouge" },
          { key: "BLUE",   hex: "#1e88e5", label: "Bleu"  },
          { key: "GREEN",  hex: "#43a047", label: "Vert"  },
          { key: "YELLOW", hex: "#fdd835", label: "Jaune" },
        ];
        const hovered = hoveredPickerColor;
        return (
          <div style={{
            position: "fixed", inset: 0,
            background: hovered ? `rgba(0,0,0,0.6)` : "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000,
            transition: "background 0.25s ease",
          }}>
            {/* Halo couleur survolée derrière la modale */}
            {hovered && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: hovered,
                opacity: 0.12,
                transition: "background 0.25s ease",
              }} />
            )}
            <div style={{
              background: hovered
                ? `linear-gradient(145deg, ${hovered}33 0%, #1e1e2e 55%)`
                : "#1e1e2e",
              borderRadius: 20, padding: "28px 36px",
              textAlign: "center",
              border: hovered ? `1px solid ${hovered}66` : "1px solid rgba(255,255,255,0.12)",
              boxShadow: hovered
                ? `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${hovered}44`
                : "0 20px 60px rgba(0,0,0,0.6)",
              transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
              position: "relative",
            }}>
              <div style={{ color: "white", fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
                Choisir une couleur
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {pickerColors.map(({ key, hex, label }, idx) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <button
                      title={label}
                      onClick={() => {
                        play('colorChosen');
                        const { card, sourceEl } = colorPicker;
                        setColorPicker(null);
                        setHoveredPickerColor(null);
                        executePlayCard(card, sourceEl, key);
                      }}
                      style={{
                        width: 64, height: 64, borderRadius: 14,
                        border: hoveredPickerColor === hex ? `3px solid white` : "3px solid rgba(255,255,255,0.2)",
                        background: hex, cursor: "pointer",
                        transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
                        transform: hoveredPickerColor === hex ? "scale(1.22)" : "scale(1)",
                        boxShadow: hoveredPickerColor === hex
                          ? `0 6px 28px ${hex}cc, 0 0 0 4px ${hex}44`
                          : `0 4px 16px ${hex}88`,
                      }}
                      onMouseEnter={() => setHoveredPickerColor(hex)}
                      onMouseLeave={() => setHoveredPickerColor(null)}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 0.5, textAlign: "center" }}>
                      {label}<span style={{ marginLeft: 4, opacity: 0.55 }}>[{idx + 1}]</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal confirmation quitter ── */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            key="quit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.82)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9800,
            }}
            onClick={() => setShowQuitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#1a1a2e",
                border: "1px solid rgba(229,57,53,0.4)",
                borderRadius: 20, padding: "32px 36px",
                textAlign: "center", maxWidth: 360,
                boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(229,57,53,0.15)",
                display: "flex", flexDirection: "column", gap: 16,
              }}
            >
              <div style={{ fontSize: 48, lineHeight: 1 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>
                Quitter la partie ?
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                Un bot prendra ta place et jouera à ta place.<br />
                Tu ne pourras <strong style={{ color: "rgba(255,120,120,0.9)" }}>pas revenir</strong> dans cette partie.
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  style={{
                    padding: "10px 24px", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  Rester
                </button>
                <button
                  onClick={() => {
                    setShowQuitConfirm(false);
                    disconnectWebSocket();
                    apiLeaveGame(gameId, playerId).catch(() => {});
                    clearSession();
                    navigate("/");
                  }}
                  style={{
                    padding: "10px 24px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #e53935, #b71c1c)",
                    color: "white", fontWeight: 900, fontSize: 14, cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(229,57,53,0.4)",
                  }}
                >
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Carte volante ── */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            className="flying-layer"
            initial={{ left: flyingCard.from.x, top: flyingCard.from.y, width: flyingCard.from.w, height: flyingCard.from.h, opacity: 1 }}
            animate={{ left: flyingCard.to.x,   top: flyingCard.to.y,   width: flyingCard.to.w,   height: flyingCard.to.h,   opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 440, damping: 32 }}
            onAnimationComplete={() => {
              const cb = flyingDoneRef.current;
              flyingDoneRef.current = null;
              setFlyingCard(null);
              cb?.();
            }}
          >
            <Card card={flyingCard.card} faceDown={flyingCard.faceDown} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
