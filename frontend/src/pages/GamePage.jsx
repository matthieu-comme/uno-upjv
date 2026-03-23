import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Hand from "../components/Hand";
import Card from "../components/Card";
import { playCard as apiPlayCard, drawCard as apiDrawCard } from "../services/api";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import "../styles/game.css";

const MOCK_STATE = {
  status: "IN_PROGRESS",
  direction: 1,
  activeColor: "RED",
  currentPlayerIndex: 0,
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

const COLOR_MAP = { RED: "#e53935", BLUE: "#1e88e5", GREEN: "#43a047", YELLOW: "#fdd835" };
const COLOR_LABEL = { RED: "ROUGE", BLUE: "BLEU", GREEN: "VERT", YELLOW: "JAUNE" };

// ─── Normalisation backend → frontend ────────────────────────────────────────
// Le backend sérialise les enums Java : RED, DRAW_TWO, WILD_DRAW_FOUR, etc.
// Le frontend attend : "red", "+2", "+4", etc.

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

  const [gameState, setGameState] = useState(isMock ? MOCK_STATE : normalizeState(navState?.initialState));
  const [wsStatus, setWsStatus] = useState(isMock ? "mock" : "connecting");
  const [showUno, setShowUno] = useState(false);
  const [ruleError, setRuleError] = useState("");
  const [notification, setNotification] = useState(null); // { text, emoji }
  const [flashSeatId, setFlashSeatId] = useState(null);
  const [colorPicker, setColorPicker] = useState(null); // { card, sourceEl }

  const deckRef      = useRef(null);
  const discardRef   = useRef(null);
  const handZoneRef  = useRef(null);
  const prevStateRef = useRef(null);
  const [flyingCard, setFlyingCard] = useState(null);
  const flyingDoneRef = useRef(null);

  // ─── WebSocket ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isMock) return;
    connectWebSocket(
      gameId,
      playerId,
      (state) => {
        setGameState(normalizeState(state));
        setWsStatus("connected");

        // Fin de partie : status FINISHED ou un joueur a 0 carte (win non détecté côté back)
        if (state.status === "FINISHED" || (state.status === "IN_PROGRESS" && state.players?.some(p => p.handSize === 0))) {
          disconnectWebSocket();
          const w = state.players?.find(p => p.handSize === 0);
          navigate(`/end/${gameId}`, {
            state: {
              winner:     w?.name ?? "Inconnu",
              winnerId:   w?.id,
              players:    state.players,
              playerId,
              playerName: navState?.playerName,
              gameId,
            },
          });
        }
      },
      () => setWsStatus("error")
    );
    return () => disconnectWebSocket();
  }, [gameId, playerId, isMock, navigate]);

  // ─── Détection des événements de jeu (pénalités, changement de tour) ────────

  useEffect(() => {
    if (!gameState) return;
    const prev = prevStateRef.current;

    if (prev) {
      const prevCurrentId = prev.players?.[prev.currentPlayerIndex]?.id;
      const currCurrentId = gameState.players?.[gameState.currentPlayerIndex]?.id;
      const newTopCard    = gameState.topCard;
      const oldTopCard    = prev.topCard;

      // Nouvelle carte posée → notifications pour la victime uniquement
      if (newTopCard?.id !== oldTopCard?.id) {
        const cardCountDiff = (gameState.myHand?.length ?? 0) - (prev.myHand?.length ?? 0);

        if (newTopCard?.value === "+2" && cardCountDiff >= 2) {
          showNotification("💀 Tu dois piocher 2 cartes !", 3000);
        } else if (newTopCard?.value === "+4" && cardCountDiff >= 4) {
          showNotification("💀 Tu dois piocher 4 cartes !", 3000);
        } else if (newTopCard?.value === "Skip") {
          // Mon tour était le prochain mais a été sauté
          const n       = prev.players.length;
          const prevDir = prev.direction ?? 1;
          const nextIdx = (prev.currentPlayerIndex + prevDir + n) % n;
          if (prev.players[nextIdx]?.id === playerId) {
            showNotification("⛔ Ton tour est passé !", 2500);
          }
        }
      }

      // Flash sur le siège du nouveau joueur actif
      if (currCurrentId && currCurrentId !== prevCurrentId && currCurrentId !== playerId) {
        setFlashSeatId(currCurrentId);
        setTimeout(() => setFlashSeatId(null), 900);
      }
    }

    prevStateRef.current = gameState;
  }, [gameState, playerId]);

  // ─── Dérivations ─────────────────────────────────────────────────────────────

  const myHand        = gameState?.myHand ?? [];
  const topCard       = gameState?.topCard ?? null;
  const players       = gameState?.players ?? [];
  const opponents     = players.filter(p => p.id !== playerId);
  const currentPlayer = players[gameState?.currentPlayerIndex];
  const isMyTurn      = currentPlayer?.id === playerId;
  const status        = gameState?.status ?? "WAITING_FOR_PLAYERS";
  const activeColor   = gameState?.activeColor;
  const direction     = gameState?.direction ?? 1;

  const hasPlayableCard = useMemo(
    () => myHand.some(c => isCardPlayable(c, topCard, activeColor)),
    [myHand, topCard, activeColor]
  );

  const seats = useMemo(() => {
    // Positions visuelles dans le sens horaire depuis le bas (moi)
    // 1 adversaire → top | 2 → left+right | 3 → left+top+right
    const posMap = { 1: ["top"], 2: ["left", "right"], 3: ["left", "top", "right"] };
    const positions = posMap[opponents.length] ?? ["top"];

    // Réordonner les adversaires dans le sens des aiguilles d'une montre depuis ma position
    const n     = players.length;
    const myIdx = players.findIndex(p => p.id === playerId);
    const ordered = [];
    for (let step = 1; step < n && ordered.length < opponents.length; step++) {
      const p = players[(myIdx + step) % n];
      if (p && p.id !== playerId) ordered.push(p);
    }

    return ordered.map((p, i) => ({ pos: positions[i] ?? "top", p }));
  }, [opponents, players, playerId]);

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

    // Carte wild : demander la couleur d'abord
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
      await apiPlayCard(gameId, playerId, card.id, chosenColor);
      animateCard(card, sourceEl, discardRef.current, () => {});
    } catch (e) {
      showError(e.message);
    }
  }

  // ─── Piocher une carte ───────────────────────────────────────────────────────

  function handleDraw() {
    if (!isMyTurn) return;

    if (isMock) {
      const colors  = ["red", "blue", "green", "yellow"];
      const values  = ["0","1","2","3","4","5","6","7","8","9","Skip","Reverse","+2"];
      const color   = colors[Math.floor(Math.random() * colors.length)];
      const value   = values[Math.floor(Math.random() * values.length)];
      const newCard = { id: `drawn-${Date.now()}`, color, value };

      const deckEl   = deckRef.current?.querySelector(".draw-card-small") ?? deckRef.current;
      const from     = rectOf(deckEl);
      const handZone = rectOf(handZoneRef.current);

      if (from && handZone) {
        const to = { x: handZone.x + handZone.w / 2 - 39, y: handZone.y + 20, w: 78, h: 112 };
        setFlyingCard({ card: { color: "wild", value: "" }, faceDown: true, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });
        flyingDoneRef.current = () => setGameState(prev => ({ ...prev, myHand: [...prev.myHand, newCard] }));
      } else {
        setGameState(prev => ({ ...prev, myHand: [...prev.myHand, newCard] }));
      }
      return;
    }

    apiDrawCard(gameId, playerId).catch(e => showError(e.message));
  }

  // ─── UNO ─────────────────────────────────────────────────────────────────────

  function handleUno() {
    if (myHand.length > 2) {
      showError("UNO ! Seulement quand il te reste 1 ou 2 cartes.");
      return;
    }
    setShowUno(true);
    setTimeout(() => setShowUno(false), 2000);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const activeColorHex = COLOR_MAP[activeColor] ?? "#555";

  return (
    <div className="game-root">

      {/* ── Top bar ── */}
      <header className="game-topbar">
        <h2 className="game-title">#{gameId}</h2>

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
              ? (isMyTurn ? "🎯 C'est ton tour !" : `Tour de ${currentPlayer?.name ?? "..."}`)
              : status === "WAITING_FOR_PLAYERS" ? `⏳ En attente… (${players.length}) — ${gameId}`
              : "🏆 Terminé"
            }
          </motion.div>
        </AnimatePresence>

        <div style={{
          fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
          background: wsStatus === "mock" ? "rgba(255,193,7,0.2)" : wsStatus === "connected" ? "rgba(67,160,71,0.3)" : wsStatus === "error" ? "rgba(229,57,53,0.3)" : "rgba(255,255,255,0.1)",
          color:      wsStatus === "mock" ? "#ffe082"            : wsStatus === "connected" ? "#a5d6a7"            : wsStatus === "error" ? "#ff8a80"            : "#ccc",
        }}>
          {wsStatus === "mock" ? "◆ Mock" : wsStatus === "connected" ? "● Connecté" : wsStatus === "error" ? "● Erreur WS" : "○ Connexion..."}
        </div>
      </header>

      {/* ── Table ── */}
      <main className="table-container">
        <div className="board-shell">

          {/* Sièges adversaires */}
          {seats.map(({ pos, p }) => {
            const isActive = currentPlayer?.id === p.id;
            const isFlash  = flashSeatId === p.id;
            return (
              <div key={p.id} className={`seat ${pos}${isActive ? " active" : ""}${isFlash ? " flash" : ""}`}>
                <div className="opponent-mini">
                  <div className="opponent-cards">
                    {Array.from({ length: Math.max(p.handSize, 1) }).map((_, i) => (
                      <div key={i} className={`opponent-card-back ${pos}`} style={{ "--i": i, "--count": p.handSize }} />
                    ))}
                  </div>
                  <div className="opponent-label">
                    {p.name}
                    {p.hasUno && <span className="uno-badge"> UNO!</span>}
                    {isActive && <span className="turn-arrow"> ▶</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Table verte */}
          <section className="table">

            {/* Défausse au centre */}
            <div className="table-center-zone">
              <div className="discard-pile" ref={discardRef}>
                {topCard
                  ? <Card card={topCard} />
                  : <div style={{ width: 78, height: 112, borderRadius: 14, border: "2px dashed rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>vide</div>
                }
              </div>
            </div>

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

      {/* ── Indicateur couleur active (fixe, au-dessus de la main) ── */}
      {activeColor && status === "IN_PROGRESS" && (
        <div className="active-color-pill">
          <div className="active-color-dot" style={{ background: activeColorHex, boxShadow: `0 0 10px ${activeColorHex}` }} />
          <span className="active-color-label">{COLOR_LABEL[activeColor] ?? activeColor}</span>
        </div>
      )}

      {/* ── Panneau d'infos de partie ── */}
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
          <div className="game-info-row">
            <span className="game-info-label">Pioche</span>
            <span className="game-info-value">{gameState?.deckSize ?? "—"}</span>
          </div>
        </div>
      )}

      {/* ── Boutons fixes ── */}
      <div className="fixed-controls">
        <button className="btn" ref={deckRef} disabled={!isMyTurn} onClick={handleDraw}>
          Pioche
        </button>
        <button
          className="btn"
          disabled={!isMyTurn || myHand.length > 2}
          onClick={handleUno}
          style={myHand.length <= 2 && isMyTurn
            ? { background: "rgba(255,200,0,0.9)", borderColor: "#ffd700", color: "#2a0000", fontWeight: 900, boxShadow: "0 0 18px rgba(255,200,0,0.65)" }
            : undefined}
        >
          UNO !
        </button>
      </div>

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

      {/* ── Notification pénalité / skip ── */}
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

      {/* ── Overlay UNO ! ── */}
      <AnimatePresence>
        {showUno && (
          <motion.div
            key="uno-overlay"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            style={{
              position: "fixed", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9000, pointerEvents: "none",
            }}
          >
            <span style={{
              fontSize: "clamp(80px, 18vw, 180px)",
              fontWeight: 900,
              color: "#e53935",
              textShadow: "0 0 40px rgba(229,57,53,0.9), 0 0 80px rgba(229,57,53,0.5), 5px 5px 0 #000",
              letterSpacing: 10,
              WebkitTextStroke: "3px #fff",
            }}>
              UNO!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sélecteur de couleur (wild) ── */}
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
            initial={{ left: flyingCard.from.x, top: flyingCard.from.y, width: flyingCard.from.w, height: flyingCard.from.h, opacity: 1, scale: 1 }}
            animate={{ left: flyingCard.to.x,   top: flyingCard.to.y,   width: flyingCard.to.w,   height: flyingCard.to.h,   opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
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
