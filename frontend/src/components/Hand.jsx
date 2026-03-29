import { useState } from "react";
import Card from "./Card";

/**
 * Affiche la main du joueur en éventail.
 * - Les cartes s'écartent dynamiquement selon le nombre
 * - onPlayCard : appelé au clic sur une carte (undefined = main passive/lecture seule)
 */
export default function Hand({ cards = [], onPlayCard }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const n = cards.length;

  // Plus il y a de cartes, plus elles se resserrent
  const spread   = n <= 1 ? 0 : Math.min(52, 460 / (n - 1));
  const maxAngle = Math.max(4, 26 - n * 1.0);

  return (
    <div className="hand fan">
      {cards.map((card, i) => {
        const t        = n === 1 ? 0.5 : i / (n - 1);
        const angle    = (t - 0.5) * maxAngle;
        const x        = (i - (n - 1) / 2) * spread;
        const y        = Math.abs(angle) * 1.2;
        const isHovered = hoveredIdx === i;

        return (
          <button
            key={card.id ?? `${card.color}-${card.value}-${i}`}
            type="button"
            className={`handCard${isHovered ? " hovered" : ""}`}
            style={{
              "--x": `${x}px`,
              "--y": `${y}px`,
              "--r": `${angle}deg`,
              // La carte survolée passe au premier plan (z-index élevé)
              zIndex: isHovered ? 200 : i + 1,
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={(e) => onPlayCard?.(card, e.currentTarget)}
          >
            <Card card={card} />
          </button>
        );
      })}
    </div>
  );
}
