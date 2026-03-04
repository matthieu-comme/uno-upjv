import Card from "./Card";

export default function Hand({ cards = [], onPlayCard }) {
  const n = cards.length;
  const maxAngle = 28;
  const maxWidth = 620;
  const spread = n <= 1 ? 0 : Math.min(42, maxWidth / (n - 1));

  return (
    <div className="hand fan">
      {cards.map((card, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = (t - 0.5) * maxAngle;
        const x = (i - (n - 1) / 2) * spread;
        const y = Math.abs(angle) * 1.2;

        return (
          <button
            key={card.id ?? `${card.color}-${card.value}-${card.type}-${i}`}
            type="button"
            className="handCard"
            style={{
              "--x": `${x}px`,
              "--y": `${y}px`,
              "--r": `${angle}deg`,
              zIndex: i,
            }}
            onClick={(e) => onPlayCard?.(card, e.currentTarget)}
          >
            <Card card={card} />
          </button>
        );
      })}
    </div>
  );
}