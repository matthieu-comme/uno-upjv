import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Hand from "../components/Hand";
import GameInfo from "../components/GameInfo";
import Card from "../components/Card";
import { playCard as apiPlayCard } from "../services/api";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import "../styles/game.css";

export default function GamePage() {
  const { gameId } = useParams();
  const { state: navState } = useLocation();
  const navigate = useNavigate();

  const playerId = navState?.playerId;

  const [gameState, setGameState] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");

  const deckRef = useRef(null);
  const discardRef = useRef(null);
  const handZoneRef = useRef(null);
  const [flyingCard, setFlyingCard] = useState(null);
  const flyingDoneRef = useRef(null);

  useEffect(() => {
    if (!gameId || !playerId) return; // pas de redirect, juste pas de WS

    connectWebSocket(
      gameId,
      playerId,
      (state) => {
        setGameState(state);
        setWsStatus("connected");
      },
      () => setWsStatus("error")
    );

    return () => disconnectWebSocket();
  }, [gameId, playerId, navigate]);

  const myHand = gameState?.myHand ?? [];
  const topCard = gameState?.topCard ?? null;
  const players = gameState?.players ?? [];
  const opponents = players.filter(p => p.id !== playerId);
  const currentPlayer = players[gameState?.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const status = gameState?.status ?? "WAITING_FOR_PLAYERS";
  const activeColor = gameState?.activeColor;

  const seats = useMemo(() => {
    const positions = ["top", "left", "right"];
    return opponents.map((p, i) => ({ pos: positions[i] ?? "top", p }));
  }, [opponents]);

  function rectOf(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  function animateCard(card, fromEl, toEl, onDone) {
    const from = rectOf(fromEl);
    const to = rectOf(toEl);
    if (!from || !to) { onDone?.(); return; }
    setFlyingCard({ card, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });
    flyingDoneRef.current = onDone;
  }

  async function handlePlayCard(card, sourceEl) {
    if (!isMyTurn) return;
    try {
      await apiPlayCard(gameId, playerId, card.id);
      animateCard(card, sourceEl, discardRef.current, () => {});
    } catch (e) {
      console.error("Impossible de jouer cette carte :", e.message);
    }
  }


  return (
    <div className="game-root">
      <header className="game-topbar">
        <h2 className="game-title">UNO — {gameId}</h2>
        <GameInfo
          currentPlayer={currentPlayer?.name ?? "..."}
          direction={gameState?.direction === 1 ? "Horaire" : "Anti-horaire"}
        />
        <div style={{
          fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
          background: wsStatus === "connected" ? "rgba(67,160,71,0.3)" : wsStatus === "error" ? "rgba(229,57,53,0.3)" : "rgba(255,255,255,0.1)",
          color: wsStatus === "connected" ? "#a5d6a7" : wsStatus === "error" ? "#ff8a80" : "#ccc",
        }}>
          {wsStatus === "connected" ? "● Connecté" : wsStatus === "error" ? "● Erreur WS" : "○ Connexion..."}
        </div>
      </header>

      {status !== "IN_PROGRESS" && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.75)", color: "white", padding: "10px 24px",
          borderRadius: 12, zIndex: 100, fontSize: 14, fontWeight: 600,
          border: "1px solid rgba(255,255,255,0.15)",
        }}>
          {status === "WAITING_FOR_PLAYERS"
            ? `⏳ En attente de joueurs (${players.length}) — Code : ${gameId}`
            : status === "FINISHED" ? "🏆 Partie terminée" : status}
        </div>
      )}

      {status === "IN_PROGRESS" && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          background: isMyTurn ? "rgba(229,57,53,0.85)" : "rgba(0,0,0,0.6)",
          color: "white", padding: "8px 20px", borderRadius: 12, zIndex: 100,
          fontSize: 14, fontWeight: 700,
        }}>
          {isMyTurn ? "🎯 C'est ton tour !" : `Tour de ${currentPlayer?.name ?? "..."}`}
        </div>
      )}

      <main className="table-container">
        <div className="board-shell">
          {seats.map(({ pos, p }) => (
            <div key={p.id} className={`seat ${pos}`}>
              <div className="seat-card">
                <div className="opponent-cards">
                  {Array.from({ length: Math.max(p.handSize, 1) }).map((_, i) => (
                    <div key={i} className={`opponent-card-back ${pos}`} style={{ "--i": i, "--count": p.handSize }} />
                  ))}
                </div>
                <div className="seat-info">
                  <div className="name">
                    {p.name}
                    {p.hasUno ? <span style={{ color: "#ff5252" }}> (UNO!)</span> : ""}
                    {currentPlayer?.id === p.id ? " 🎯" : ""}
                  </div>
                  <div className="count">{p.handSize} carte{p.handSize > 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
          ))}

          <section className="table">
            {activeColor && (
              <div style={{
                position: "absolute", top: 8, right: 8,
                width: 24, height: 24, borderRadius: "50%",
                background: { RED:"#e53935", BLUE:"#1e88e5", GREEN:"#43a047", YELLOW:"#fdd835", BLACK:"#111" }[activeColor] ?? "#555",
                border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }} title={`Couleur active : ${activeColor}`} />
            )}

            <div className="discard-center" ref={discardRef}>
              <div className="pile-label">Défausse</div>
              {topCard
                ? <Card card={topCard} />
                : <div style={{ width: 78, height: 112, borderRadius: 14, border: "2px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>vide</div>
              }
            </div>

            <div className="draw-corner" ref={deckRef}>
              <div className="pile-label small">Pioche</div>
              <div className="draw-card-small">
                <Card card={{ color: "wild", value: "" }} faceDown />
              </div>
            </div>
          </section>
        </div>
      </main>

      <section className="player-hand-zone" ref={handZoneRef}>
        {myHand.length > 0
          ? <Hand cards={myHand} onPlayCard={isMyTurn ? handlePlayCard : undefined} />
          : <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: "20px" }}>
              {status === "WAITING_FOR_PLAYERS" ? "En attente du début de la partie..." : "Aucune carte"}
            </div>
        }
      </section>

      <div className="fixed-controls">
        <button className="btn" disabled={!isMyTurn}>Pioche</button>
        <button className="btn" disabled>UNO</button>
      </div>

      <AnimatePresence>
        {flyingCard && (
          <motion.div
            className="flying-layer"
            initial={{ left: flyingCard.from.x, top: flyingCard.from.y, width: flyingCard.from.w, height: flyingCard.from.h, opacity: 1, scale: 1 }}
            animate={{ left: flyingCard.to.x, top: flyingCard.to.y, width: flyingCard.to.w, height: flyingCard.to.h, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 35 }}
            onAnimationComplete={() => {
              const cb = flyingDoneRef.current;
              flyingDoneRef.current = null;
              setFlyingCard(null);
              cb?.();
            }}
          >
            <Card card={flyingCard.card} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
