import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Hand from "../components/Hand";
import GameInfo from "../components/GameInfo";
import Card from "../components/Card";
import "../styles/game.css";

export default function GamePage() {
  const mockPlayers = [
    { id: 2, name: "Antoine", cardCount: 5, saidUno: false },
    { id: 3, name: "Lucien", cardCount: 3, saidUno: true },
  ];

  const [topCard, setTopCard] = useState({ color: "red", value: 8, type: "number" });

  const [myHand, setMyHand] = useState([
    { id: "c1", color: "red", value: 5, type: "number" },
    { id: "c2", color: "blue", value: "+2", type: "action" },
    { id: "c3", color: "green", value: 7, type: "number" },
    { id: "c4", color: "wild", value: "wild", type: "wild" },
  ]);

  const currentPlayerId = 2;

  const seats = useMemo(
    () =>
      [
        { pos: "top", p: mockPlayers[0] },
        { pos: "left", p: mockPlayers[1] },
      ].filter((s) => s.p),
    [mockPlayers]
  );

  // refs pour connaître la position écran des piles
  const deckRef = useRef(null);
  const discardRef = useRef(null);

  // overlay animation state
  const [flyingCard, setFlyingCard] = useState(null);
  // flyingCard: { card, from:{x,y,w,h}, to:{x,y,w,h} }

  function rectOf(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  async function animateCard(card, fromEl, toEl, onDone) {
    const from = rectOf(fromEl);
    const to = rectOf(toEl);
    if (!from || !to) {
      onDone?.();
      return;
    }
    setFlyingCard({ card, from, to, key: crypto.randomUUID?.() ?? String(Date.now()) });

    // onDone sera appelé à la fin via onAnimationComplete
    // on stocke un callback dans un state simple :
    flyingDoneRef.current = onDone;
  }

  const flyingDoneRef = useRef(null);

  // JOUER UNE CARTE : main -> défausse
  function handlePlayCard(card, sourceEl) {
    // 1) retire de la main tout de suite (ça fait un espace)
    setMyHand((prev) => prev.filter((c) => c.id !== card.id));

    // 2) anime vers la défausse
    animateCard(card, sourceEl, discardRef.current, () => {
      setTopCard(card);
    });
  }

  // PIOCHER : pioche -> main
  function handleDraw() {
    // mock d’une carte piochée
    const newCard = {
      id: crypto.randomUUID?.() ?? `new-${Date.now()}`,
      color: ["red", "blue", "green", "yellow"][Math.floor(Math.random() * 4)],
      value: Math.floor(Math.random() * 10),
      type: "number",
    };

    // anime depuis la pioche vers le bas (zone main)
    // destination = on vise le centre de la zone main (un div ref, ou fallback)
    const handZoneEl = document.querySelector(".bottom-zone"); // simple, sans ref pour l’instant

    animateCard(newCard, deckRef.current, handZoneEl, () => {
      setMyHand((prev) => [...prev, newCard]);
    });
  }

  return (
    <div className="game-root">
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>UNO Game</h2>
        <GameInfo currentPlayer="Sisox" direction="Clockwise" />
      </div>

      <div className="table-container">
        <div className="table">
          {seats.map(({ pos, p }) => (
            <div key={p.id} className={`seat ${pos} ${p.id === currentPlayerId ? "active" : ""}`}>
              <div>
                <div className="name">
                  {p.name} {p.saidUno ? "(UNO)" : ""}
                </div>
                <div className="count">{p.cardCount} cartes</div>
              </div>
            </div>
          ))}

          <div className="center-zone">
            {/* Pioche */}
            <div style={{ textAlign: "center" }} ref={deckRef}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Pioche</div>
              <Card card={{ color: "wild", value: "" }} faceDown />
            </div>

            {/* Défausse */}
            <div style={{ textAlign: "center" }} ref={discardRef}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Défausse</div>
              <Card card={topCard} />
            </div>
          </div>
        </div>
      </div>

      {/* Overlay d’animation (au-dessus de tout) */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            className="flying-layer"
            initial={{
              left: flyingCard.from.x,
              top: flyingCard.from.y,
              width: flyingCard.from.w,
              height: flyingCard.from.h,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              left: flyingCard.to.x,
              top: flyingCard.to.y,
              width: flyingCard.to.w,
              height: flyingCard.to.h,
              opacity: 1,
              scale: 1,
            }}
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

      <div className="bottom-zone">
        <Hand cards={myHand} onPlayCard={handlePlayCard} />

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
          <button className="btn" onClick={handleDraw}>Pioche</button>
          <button className="btn" onClick={() => console.log("uno")}>UNO</button>
        </div>
      </div>
    </div>
  );
}