const colorMap = {
  red: "#e53935",
  blue: "#1e88e5",
  green: "#43a047",
  yellow: "#fdd835",
  wild: "#111",
};

export default function Card({ card, faceDown = false, onClick }) {
  const bg = faceDown ? "#111" : (colorMap[card.color] ?? "#222");

  return (
    <button
      onClick={onClick}
      style={{
        width: 78,
        height: 112,
        borderRadius: 14,
        border: "2px solid rgba(255,255,255,0.22)",
        background: bg,
        color: "white",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease"
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
      title={faceDown ? "Carte" : `${card.color} ${card.value}`}
    >
      {/* Ellipse style UNO */}
      <div style={{
        position: "absolute",
        inset: -18,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.16)",
        transform: "rotate(-18deg)",
      }} />

      {/* Valeur */}
      <div style={{
        position: "relative",
        zIndex: 1,
        fontSize: faceDown ? 18 : 28,
        fontWeight: 900,
        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}>
        {faceDown ? "UNO" : card.value}
      </div>
    </button>
  );
}