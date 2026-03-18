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

  const currentPlayerId = 2;

  const [topCard, setTopCard] = useState({
    color: "red",
    value: 8,
    type: "number",
  });

  const [myHand, setMyHand] = useState([
    { id: "c1", color: "red", value: 5, type: "number" },
    { id: "c2", color: "blue", value: "+2", type: "action" },
    { id: "c3", color: "green", value: 7, type: "number" },
    { id: "c4", color: "wild", value: "wild", type: "wild" },
  ]);

  const seats = useMemo(
    () =>
      [
        { pos: "top", p: mockPlayers[0] },
        { pos: "left", p: mockPlayers[1] },
      ].filter((s) => s.p),
    []
  );

  const deckRef = useRef(null);
  const discardRef = useRef(null);
  const handZoneRef = useRef(null);

  const [flyingCard, setFlyingCard] = useState(null);
  const flyingDoneRef = useRef(null);

  function rectOf(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
    };
  }

  function animateCard(card, fromEl, toEl, onDone) {
    const from = rectOf(fromEl);
    const to = rectOf(toEl);

    if (!from || !to) {
      onDone?.();
      return;
    }

    setFlyingCard({
      card,
      from,
      to,
      key: crypto.randomUUID?.() ?? String(Date.now()),
    });

    flyingDoneRef.current = onDone;
  }

  function handlePlayCard(card, sourceEl) {
    setMyHand((prev) => prev.filter((c) => c.id !== card.id));

    animateCard(card, sourceEl, discardRef.current, () => {
      setTopCard(card);
    });
  }

  function handleDraw() {
    const newCard = {
      id: crypto.randomUUID?.() ?? `new-${Date.now()}`,
      color: ["red", "blue", "green", "yellow"][
        Math.floor(Math.random() * 4)
      ],
      value: Math.floor(Math.random() * 10),
      type: "number",
    };

    animateCard(newCard, deckRef.current, handZoneRef.current, () => {
      setMyHand((prev) => [...prev, newCard]);
    });
  }

  return (
    <div className="game-root">
      <header className="game-topbar">
        <h2 className="game-title">UNO Game</h2>
        <GameInfo currentPlayer="Sisox" direction="Clockwise" />
      </header>

      <main className="table-container">
        <div className="board-shell">
          {seats.map(({ pos, p }) => (
            <div
              key={p.id}
              className={`seat ${pos} ${p.id === currentPlayerId ? "active" : ""}`}
            >
              <div className="seat-card">
                <div className="opponent-cards">
                  {Array.from({ length: p.cardCount }).map((_, index) => (
                    <div
                      key={index}
                      className={`opponent-card-back ${pos}`}
                      style={{
                        "--i": index,
                        "--count": p.cardCount,
                      }}
                    />
                  ))}
                </div>

                <div className="seat-info">
                  <div className="name">
                    {p.name} {p.saidUno ? "(UNO)" : ""}
                  </div>
                  <div className="count">{p.cardCount} cartes</div>
                </div>
              </div>
            </div>
          ))}

          <section className="table">
            <div className="discard-center" ref={discardRef}>
              <div className="pile-label">Défausse</div>
              <Card card={topCard} />
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
        <Hand cards={myHand} onPlayCard={handlePlayCard} />
      </section>

      <div className="fixed-controls">
        <button className="btn" onClick={handleDraw}>
          Pioche
        </button>
        <button className="btn" onClick={() => console.log("uno")}>
          UNO
        </button>
      </div>

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
    </div>
  );
}