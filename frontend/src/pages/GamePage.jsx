import Hand from "../components/Hand";
import PlayersList from "../components/PlayersList";
import GameInfo from "../components/GameInfo";
import Card from "../components/Card";
import "../styles/game.css";

export default function GamePage() {
  const mockPlayers = [
    { id: 2, name: "Antoine", cardCount: 5, saidUno: false },
    { id: 3, name: "Lucien", cardCount: 3, saidUno: true },
  ];

  const topCard = { color: "red", value: 8, type: "number" };

  const myHand = [
    { color: "red", value: 5, type: "number" },
    { color: "blue", value: "+2", type: "action" },
    { color: "green", value: 7, type: "number" },
    { color: "wild", value: "wild", type: "wild" },
  ];

  const currentPlayerId = 2; // mock: Alice joue

  const seats = [
    { pos: "top", p: mockPlayers[0] },
    { pos: "left", p: mockPlayers[1] },
  ].filter(s => s.p);

  return (
    <div className="game-root">
      {/* Optionnel : barre d’info en haut */}
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>UNO Game</h2>
        <GameInfo currentPlayer="Sisox" direction="Clockwise" />
      </div>

      {/* Table au centre */}
      <div className="table-container">
        <div className="table">
          <PlayersList players={mockPlayers} />
          {seats.map(({ pos, p }) => (
            <div
              key={p.id}
              className={`seat ${pos} ${p.id === currentPlayerId ? "active" : ""}`}
            >
              <div>
                <div className="name">
                  {p.name} {p.saidUno ? "(UNO)" : ""}
                </div>
                <div className="count">{p.cardCount} cartes</div>
              </div>
            </div>
          ))}

          {/* Piles au centre */}
          <div className="center-zone">
            {/* Pioche (carte cachée) */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Pioche</div>
              <Card card={{ color: "wild", value: "" }} faceDown />
            </div>

            {/* Défausse */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Défausse</div>
              <Card card={topCard} />
            </div>
          </div>
        </div>
      </div>

      {/* Bas de l’écran : joueurs + main + boutons */}
      <div className="bottom-zone">
        <Hand cards={myHand} />

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
          <button className="btn" onClick={() => console.log("draw")}>Pioche</button>
          <button className="btn" onClick={() => console.log("uno")}>UNO</button>
        </div>
      </div>
    </div>
  );
}