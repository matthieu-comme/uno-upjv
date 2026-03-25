import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Hand from "../components/Hand";
import Card from "../components/Card";
import {
  playCard as apiPlayCard,
  drawCard as apiDrawCard,
  callUno as apiCallUno,
  counterUno as apiCounterUno,
  getGameState as apiGetGameState,
} from "../services/api";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import "../styles/game.css";

const MOCK_STATE = {
  status: "IN_PROGRESS",
  direction: 1,
  activeColor: "RED",
  currentPlayerIndex: 0,
  deckSize: 42,
  topCard: { id: "t1", color: "red", value: "7" },
  myHand: [
    { id: "h1", color: "red",    value: "3" },
    { id: "h2", color: "blue",   value: "Skip" },
    { id: "h3", color: "green",  value: "2" },
    { id: "h4", color: "yellow", value: "9" },
    { id: "h5", color: "wild",   value: "+4" },
    { id: "h6", color: "red",    value: "Reverse" },
    { id: "h7", color: "blue",   value: "1" },
  ],
  players: [
    { id: "mock-me", name: "Toi (mock)", handSize: 7, hasUno: false },
    { id: "mock-a",  name: "Alice",      handSize: 4, hasUno: false },
    { id: "mock-b",  name: "Bob",        handSize: 1, hasUno: true  },
  ],
};

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

function normalizeState(state) {
  if (!state) return null;
  return {
    ...state,
    topCard: normalizeCard(state.topCard),
    myHand:  (state.myHand ?? []).map(normalizeCard),
  };
}

function isCardPlayable(card, topCard, activeColor) {
  if (!topCard) return true;
  if (card.color === "wild") return true;
  const active = (activeColor ?? topCard.color).toLowerCase();
  return card.color === active || card.value === topCard.value;
}

export default function GamePage() {
  const { gameId } = useParams();
  const { state: navState } = useLocation();
  const navigate = useNavigate();

  const rawPlayerId = navState?.playerId;
  const isMock = !rawPlayerId;
  const playerId = isMock ? "mock-me" : rawPlayerId;
  // IDs des joueurs humains passés depuis le lobby — les autres sont des bots
  const humanPlayerIds = useMemo(
    () => new Set(navState?.humanPlayerIds ?? []),
    [navState?.humanPlayerIds]
  );
  const isBot = (id) => !isMock && humanPlayerIds.size > 0 && !humanPlayerIds.has(id);

  const [gameState, setGameState] = useState(isMock ? MOCK_STATE : normalizeState(navState?.initialState));
  // "mock" | "connecting" | "connected" | "reconnecting:N:MAX" | "failed"
  const [wsStatus, setWsStatus] = useState(isMock ? "mock" : "connecting");
  // { name, isMe } — visible par tout le monde quand un joueur passe à 1 carte
  const [unoOverlay, setUnoOverlay] = useState(null);
  const [ruleError, setRuleError] = useState("");
  const [notification, setNotification] = useState(null);
  const [flashSeatId, setFlashSeatId] = useState(null);
  const [colorPicker, setColorPicker] = useState(null);
  const [winnerOverlay, setWinnerOverlay] = useState(null);
  // Suivi local des joueurs ayant annoncé UNO (Set de player IDs)
  const [unoCalled, setUnoCalled] = useState(new Set());

  const deckRef      = useRef(null);
  const discardRef   = useRef(null);
  const handZoneRef  = useRef(null);
  const prevStateRef = useRef(null);
  const [flyingCard, setFlyingCard] = useState(null);
  const flyingDoneRef = useRef(null);

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

  // ─── Nettoyage fermeture onglet ──────────────────────────────────────────────
  useEffect(() => {
    if (isMock) return;
    const handleUnload = () => {
      navigator.sendBeacon(
        `/api/games/${gameId}/leave`,
        new Blob([JSON.stringify({ playerId })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [gameId, playerId, isMock]);

  // ─── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMock) return;
    connectWebSocket(
      gameId,
      playerId,
      (state) => {
        setGameState(normalizeState(state));

        const isFinished = state.status === "FINISHED"
          || (state.status === "IN_PROGRESS" && state.players?.some(p => p.handSize === 0));

        if (isFinished) {
          disconnectWebSocket();
          const w = state.players?.find(p => p.handSize === 0)
                 ?? state.players?.[state.currentPlayerIndex];
          const endNavState = {
            winner:     w?.name ?? "Inconnu",
            winnerId:   w?.id,
            players:    state.players,
            playerId,
            playerName: navState?.playerName,
            gameId,
          };
          setWinnerOverlay({ name: w?.name ?? "Inconnu", countdown: 10, navState: endNavState });
        }
      },
      (status, attempt, max) => {
        if (status === 'connected' || status === 'reconnected') {
          setWsStatus("connected");
        } else if (status === 'reconnecting') {
          setWsStatus(`reconnecting:${attempt}:${max}`);
        } else if (status === 'failed' || status === 'error') {
          setWsStatus("failed");
        }
      }
    );
    return () => disconnectWebSocket();
  }, [gameId, playerId, isMock, navigate]);

  // ─── Polling fallback quand c'est le tour d'un bot ───────────────────────────
  // Actif uniquement si le backend ne diffuse pas encore après les tours de bot.
  // Nécessite GET /api/games/{gameId}/state/{playerId} côté backend.
  useEffect(() => {
    if (isMock) return;
    const currentPlayerId = gameState?.players?.[gameState?.currentPlayerIndex]?.id;
    const botIsPlaying = currentPlayerId && isBot(currentPlayerId) && gameState?.status === "IN_PROGRESS";
    if (!botIsPlaying) return;

    const interval = setInterval(async () => {
      try {
        const state = await apiGetGameState(gameId, playerId);
        if (state) setGameState(normalizeState(state));
      } catch {
        // endpoint pas encore disponible — silencieux
      }
    }, 2000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerIndex, gameState?.status, gameId, playerId, isMock]);

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
          showNotification("💀 Tu dois piocher 2 cartes !", 3000);
        } else if (newTopCard?.value === "+4" && cardCountDiff >= 4) {
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

      // Détecter quand un joueur passe à 1 carte → overlay UNO visible par tous
      for (const p of gameState.players ?? []) {
        const prevP = prev.players?.find(q => q.id === p.id);
        if (p.handSize === 1 && prevP && prevP.handSize > 1) {
          const isMe = p.id === playerId;
          setUnoOverlay({ name: p.name, isMe });
          setTimeout(() => setUnoOverlay(null), 2200);
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

      // Nettoyer UNO annoncé quand un joueur n'a plus 1 carte
      setUnoCalled(prev => {
        let changed = false;
        const next = new Set(prev);
        for (const p of gameState.players ?? []) {
          if (p.handSize !== 1 && next.has(p.id)) {
            next.delete(p.id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
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

  // Adversaires ayant 1 carte sans avoir annoncé UNO → cibles Contre-UNO
  const counterUnoTargets = useMemo(
    () => players.filter(p => p.id !== playerId && p.handSize === 1 && !unoCalled.has(p.id)),
    [players, playerId, unoCalled]
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
    setRuleError(msg);
    setTimeout(() => setRuleError(""), 2500);
  }

  function showNotification(text, duration = 2500) {
    setNotification(text);
    setTimeout(() => setNotification(null), duration);
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
    if (isMock) {
      animateCard(card, sourceEl, discardRef.current, () => {
        setGameState(prev => ({
          ...prev,
          topCard: card,
          activeColor: chosenColor ?? (card.color === "wild" ? prev.activeColor : card.color.toUpperCase()),
          myHand: prev.myHand.filter(c => c.id !== card.id),
        }));
      });
      return;
    }

    try {
      // Animation départ immédiate, même avant la réponse du serveur
      animateCard(card, sourceEl, discardRef.current, () => {});
      await apiPlayCard(gameId, playerId, card.id, chosenColor);
    } catch (e) {
      showError(e.message);
    }
  }

  // ─── Piocher une carte ───────────────────────────────────────────────────────
  function handleDraw() {
    if (!isMyTurn) return;

    // Animation : carte dos volante depuis la pioche vers la main
    const deckEl   = deckRef.current;
    const from     = rectOf(deckEl);
    const handZone = rectOf(handZoneRef.current);

    if (from && handZone) {
      const to = { x: handZone.x + handZone.w / 2 - 39, y: handZone.y + 20, w: 78, h: 112 };

      if (isMock) {
        const colors  = ["red", "blue", "green", "yellow"];
        const values  = ["0","1","2","3","4","5","6","7","8","9","Skip","Reverse","+2"];
        const color   = colors[Math.floor(Math.random() * colors.length)];
        const value   = values[Math.floor(Math.random() * values.length)];
        const newCard = { id: `drawn-${Date.now()}`, color, value };
        setFlyingCard({ card: { color: "wild", value: "" }, faceDown: true, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });
        flyingDoneRef.current = () => setGameState(prev => ({ ...prev, myHand: [...prev.myHand, newCard] }));
        return;
      }

      // Mode réel : animation en avance, le WS apportera la mise à jour
      setFlyingCard({ card: { color: "wild", value: "" }, faceDown: true, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });
      flyingDoneRef.current = null;
    }

    if (!isMock) {
      apiDrawCard(gameId, playerId).catch(e => showError(e.message));
    }
  }

  // ─── UNO ─────────────────────────────────────────────────────────────────────
  function handleUno() {
    if (myHand.length > 2) {
      showError("UNO ! Seulement quand il te reste 1 ou 2 cartes.");
      return;
    }
    setUnoCalled(prev => new Set([...prev, playerId]));
    setUnoOverlay({ name: navState?.playerName ?? "Toi", isMe: true });
    setTimeout(() => setUnoOverlay(null), 2200);
    apiCallUno(gameId, playerId).catch(() => {});
  }

  // ─── Contre-UNO ──────────────────────────────────────────────────────────────
  function handleCounterUno(target) {
    setUnoCalled(prev => new Set([...prev, target.id]));
    showNotification(`💀 Contre-UNO ! ${target.name} pioche 2 cartes !`, 3000);
    apiCounterUno(gameId, playerId, target.id).catch(() => {});
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const activeColorHex = COLOR_MAP[activeColor] ?? "#555";

  return (
    <div className="game-root">

      {/* ── Fond animé d'ambiance ── */}
      <div className="game-bg" aria-hidden="true">
        <div className="game-bg-orb orb-1" />
        <div className="game-bg-orb orb-2" />
        <div className="game-bg-orb orb-3" />
        <div className="game-bg-orb orb-4" />
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

        <div style={{
          fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
          background: wsStatus === "mock"      ? "rgba(255,193,7,0.2)"
                    : wsStatus === "connected" ? "rgba(67,160,71,0.3)"
                    : isFailed                 ? "rgba(229,57,53,0.3)"
                    : isReconnecting           ? "rgba(255,152,0,0.3)"
                    : "rgba(255,255,255,0.1)",
          color: wsStatus === "mock"      ? "#ffe082"
               : wsStatus === "connected" ? "#a5d6a7"
               : isFailed                 ? "#ff8a80"
               : isReconnecting           ? "#ffcc80"
               : "#ccc",
        }}>
          {wsStatus === "mock"      ? "◆ Mock"
         : wsStatus === "connected" ? "● Connecté"
         : isFailed                 ? "● Hors ligne"
         : isReconnecting           ? `↻ Reconnexion… (${reconnectAttempt}/${reconnectMax})`
         : "○ Connexion…"}
        </div>
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
                    {p.hasUno && p.isConnected !== false && <span className="uno-badge"> UNO!</span>}
                    {isActive && <span className="turn-arrow"> ▶</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Table verte */}
          <section className="table">

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
                    <Card card={{ color: "wild", value: "" }} faceDown noHover />
                  </div>
                </div>
                <div className="deck-count-label">{deckSize} carte{deckSize !== 1 ? "s" : ""}</div>
              </div>

              {/* Défausse */}
              <div className="discard-pile" ref={discardRef}>
                {topCard
                  ? <Card card={topCard} noHover />
                  : <div style={{ width: 78, height: 112, borderRadius: 14, border: "2px dashed rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>vide</div>
                }
              </div>

            </div>

            {/* Bouton UNO / Contre-UNO — même bouton, comportement contextuel */}
            {status === "IN_PROGRESS" && (() => {
              const counterTarget = counterUnoTargets[0];
              const canUno = myHand.length <= 2 && !unoCalled.has(playerId);
              const isActive = counterTarget != null || canUno;
              return (
                <button
                  className={`table-uno-btn${isActive ? " active" : ""}`}
                  disabled={!isActive}
                  title={counterTarget ? `Contre-UNO sur ${counterTarget.name}` : "Annoncer UNO"}
                  onClick={() => counterTarget ? handleCounterUno(counterTarget) : handleUno()}
                >
                  {counterTarget ? `Contre ! ${counterTarget.name}` : "UNO !"}
                </button>
              );
            })()}

          </section>
        </div>
      </main>

      {/* ── Main du joueur ── */}
      <section className="player-hand-zone" ref={handZoneRef}>
        {myHand.length > 0
          ? <Hand cards={myHand} onPlayCard={isMyTurn ? handlePlayCard : undefined} />
          : <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: "20px" }}>
              {status === "WAITING_FOR_PLAYERS" ? "En attente du début de la partie..." : "Aucune carte"}
            </div>
        }
      </section>

      {/* ── Panneau d'infos ── */}
      {status === "IN_PROGRESS" && (
        <div className="game-info-panel">
          <div className="game-info-row">
            <span className="game-info-label">Joueurs</span>
            <span className="game-info-value">{players.length}</span>
          </div>
          <div className="game-info-row">
            <span className="game-info-label">Ma main</span>
            <span className="game-info-value">{myHand.length} carte{myHand.length > 1 ? "s" : ""}</span>
          </div>
          <div className="game-info-row">
            <span className="game-info-label">Sens</span>
            <span className="game-info-value">{direction === 1 ? "↻ Horaire" : "↺ Anti-H."}</span>
          </div>
        </div>
      )}

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
                {unoOverlay.name}
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
            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: 8, padding: "12px 36px", borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #e53935, #b71c1c)",
                color: "white", fontWeight: 900, fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(229,57,53,0.4)",
              }}
            >
              Retour à l'accueil
            </button>
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
      {colorPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000,
        }}>
          <div style={{
            background: "#1e1e2e", borderRadius: 20, padding: "28px 36px",
            textAlign: "center", border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
              Choisir une couleur
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[
                { key: "RED",    hex: "#e53935", label: "Rouge" },
                { key: "BLUE",   hex: "#1e88e5", label: "Bleu"  },
                { key: "GREEN",  hex: "#43a047", label: "Vert"  },
                { key: "YELLOW", hex: "#fdd835", label: "Jaune" },
              ].map(({ key, hex, label }) => (
                <button
                  key={key}
                  title={label}
                  onClick={() => {
                    const { card, sourceEl } = colorPicker;
                    setColorPicker(null);
                    executePlayCard(card, sourceEl, key);
                  }}
                  style={{
                    width: 56, height: 56, borderRadius: 12, border: "3px solid rgba(255,255,255,0.2)",
                    background: hex, cursor: "pointer", transition: "transform 0.15s",
                    boxShadow: `0 4px 16px ${hex}88`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
            <Card card={flyingCard.card} faceDown={flyingCard.faceDown} noHover />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
