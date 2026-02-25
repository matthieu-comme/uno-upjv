export default function PlayersList({ players }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 14,
        flexWrap: "wrap",
        margin: "10px 0 6px",
      }}
    >
      {players.map((p) => (
        <div
          key={p.id ?? p.name}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(0,0,0,0.06)",
            minWidth: 160,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 800 }}>{p.name}</div>
            {p.saidUno ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "#e53935",
                  color: "white",
                }}
              >
                UNO
              </span>
            ) : null}
          </div>

          <div style={{ opacity: 0.85, marginTop: 4 }}>
            {p.cardCount} carte{p.cardCount > 1 ? "s" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}