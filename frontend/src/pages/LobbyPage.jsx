import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";

export default function LobbyPage() {
  const { gameId } = useParams();
  const { state: navState } = useLocation();
  const navigate = useNavigate();

  const playerId = navState?.playerId;
  const playerName = navState?.playerName;

  const [players, setPlayers] = useState(navState?.players ?? []);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!gameId || !playerId) return; // pas de redirect, juste pas de WS

    connectWebSocket(gameId, playerId, (gameState) => {
      setPlayers(gameState.players ?? []);

      // Quand startGame sera implémenté, le statut passera à IN_PROGRESS
      if (gameState.status === "IN_PROGRESS") {
        disconnectWebSocket();
        navigate(`/game/${gameId}`, {
          state: { playerId, gameId, playerName },
        });
      }
    });

    return () => disconnectWebSocket();
  }, [gameId, playerId, navigate, playerName]);

  function copyCode() {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      color: "white", gap: 32,
    }}>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>Salle d'attente</h1>

      {/* Code de la partie */}
      <div style={{
        background: "rgba(255,255,255,0.07)", borderRadius: 16,
        padding: "20px 32px", textAlign: "center",
        border: "1px solid rgba(255,255,255,0.12)",
      }}>
        <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 8 }}>Code de la partie</div>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 6, fontFamily: "monospace" }}>
          {gameId}
        </div>
        <button onClick={copyCode} style={{
          marginTop: 12, padding: "6px 18px", borderRadius: 8, border: "none",
          background: copied ? "rgba(67,160,71,0.3)" : "rgba(255,255,255,0.1)",
          color: "white", cursor: "pointer", fontSize: 13,
        }}>
          {copied ? "✓ Copié !" : "Copier le code"}
        </button>
      </div>

      {/* Liste des joueurs */}
      <div style={{
        background: "rgba(255,255,255,0.07)", borderRadius: 16,
        padding: "20px 32px", minWidth: 280,
        border: "1px solid rgba(255,255,255,0.12)",
      }}>
        <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 14 }}>
          Joueurs ({players.length})
        </div>
        {players.map((p) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: p.isConnected ? "#69f0ae" : "#ff5252",
            }} />
            <span style={{ fontWeight: p.name === playerName ? 700 : 400 }}>
              {p.name} {p.name === playerName ? "(toi)" : ""}
            </span>
          </div>
        ))}

        <div style={{ marginTop: 16, opacity: 0.5, fontSize: 13, textAlign: "center" }}>
          En attente que la partie démarre...
        </div>
      </div>

      <button onClick={() => navigate("/")} style={{
        padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
        background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14,
      }}>
        Quitter
      </button>
    </div>
  );
}
