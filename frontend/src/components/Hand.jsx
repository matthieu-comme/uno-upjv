import { useState } from "react";
import Card from "./Card";

export default function Hand({ cards = [], onPlayCard }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const n        = cards.length;
  const maxAngle = 26;
  const spread   = n <= 1 ? 0 : Math.min(64, 820 / (n - 1));

  return (
    <div className="hand fan">
      {cards.map((card, i) => {
        const t     = n === 1 ? 0.5 : i / (n - 1);
        const angle = (t - 0.5) * maxAngle;
        const x     = (i - (n - 1) / 2) * spread;
        const y     = Math.abs(angle) * 1.2;
        const isHovered = hoveredIdx === i;

        return (
          <button
            key={card.id ?? `${card.color}-${card.value}-${i}`}
            type="button"
            className={`handCard${isHovered ? " hovered" : ""}`}
            style={{
              "--x": `${x}px`,
              "--y": `${y}px`,
              "--r": isHovered ? "0deg" : `${angle}deg`,
              zIndex: isHovered ? 200 : i,
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
