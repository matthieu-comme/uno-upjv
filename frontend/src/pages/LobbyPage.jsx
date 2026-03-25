import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import { startGame, leaveGame } from "../services/api";

export default function LobbyPage() {
  const { gameId } = useParams();
  const { state: navState } = useLocation();
  const navigate = useNavigate();

  const playerId   = navState?.playerId;
  const playerName = navState?.playerName;

  const [players,    setPlayers]    = useState(navState?.players ?? []);
  const [copied,     setCopied]     = useState(false);
  const [startError, setStartError] = useState("");
  const [starting,   setStarting]   = useState(false);
  const hasLeftRef = useRef(false);

  const isCreator    = players.length > 0 && players[0]?.id === playerId;
  const canStart     = isCreator && players.length >= 1;
  const maxPlayers   = navState?.maxPlayers ?? null;
  const botsNeeded   = maxPlayers ? Math.max(0, maxPlayers - players.length) : 0;

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !playerId) return;

    connectWebSocket(gameId, playerId, (gameState) => {
      setPlayers(gameState.players ?? []);

      if (gameState.status === "IN_PROGRESS") {
        disconnectWebSocket();
        navigate(`/game/${gameId}`, {
          state: {
            playerId,
            gameId,
            playerName,
            initialState: gameState,
            // IDs des joueurs humains présents au lobby (les autres seront des bots)
            humanPlayerIds: players.map(p => p.id),
          },
        });
      }
    }, () => {}); // onStateChange ignoré dans le lobby

    return () => disconnectWebSocket();
  }, [gameId, playerId, navigate, playerName]);

  // ── Nettoyage si fermeture onglet / navigation navigateur ─────────────────
  useEffect(() => {
    function onUnload() {
      if (gameId && playerId && !hasLeftRef.current) {
        navigator.sendBeacon(
          `/api/games/${gameId}/leave`,
          new Blob([JSON.stringify({ playerId })], { type: "application/json" })
        );
      }
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [gameId, playerId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    try { await leaveGame(gameId, playerId); } catch {}
    disconnectWebSocket();
    navigate("/");
  }

  async function handleStart() {
    setStarting(true);
    try {
      await startGame(gameId);
      // Le WS recevra le status IN_PROGRESS et redirigera automatiquement
    } catch (e) {
      setStartError(e.message ?? "Impossible de démarrer la partie");
      setTimeout(() => setStartError(""), 3000);
      setStarting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
        {players.map((p, i) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: p.isConnected ? "#69f0ae" : "#ff5252",
            }} />
            <span style={{ fontWeight: p.id === playerId ? 700 : 400, flex: 1 }}>
              {p.name} {p.id === playerId ? "(toi)" : ""}
            </span>
            {i === 0 && (
              <span style={{ fontSize: 11, opacity: 0.5, fontStyle: "italic" }}>hôte</span>
            )}
          </div>
        ))}

        <div style={{ marginTop: 16, opacity: 0.5, fontSize: 13, textAlign: "center" }}>
          {isCreator
            ? players.length < 2
              ? "En attente d'autres joueurs..."
              : "Prêt à démarrer !"
            : "En attente que l'hôte lance la partie..."}
        </div>
      </div>

      {/* Erreur démarrage */}
      {startError && (
        <div style={{
          background: "rgba(229,57,53,0.2)", border: "1px solid rgba(229,57,53,0.4)",
          color: "#ff8a80", borderRadius: 10, padding: "10px 20px", fontSize: 14,
        }}>
          {startError}
        </div>
      )}

      {/* Boutons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
        {isCreator && (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            style={{
              padding: "12px 0", borderRadius: 12, border: "none",
              background: canStart && !starting
                ? "linear-gradient(135deg, #43a047, #2e7d32)"
                : "rgba(255,255,255,0.1)",
              color: canStart && !starting ? "white" : "rgba(255,255,255,0.3)",
              fontWeight: 900, fontSize: 16, cursor: canStart && !starting ? "pointer" : "default",
              letterSpacing: 1,
            }}
          >
            {starting ? "Démarrage..." : "▶  Lancer la partie"}
          </button>
        )}

        <button onClick={handleLeave} style={{
          padding: "8px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
          background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14,
        }}>
          Quitter
        </button>
      </div>
    </div>
  );
}
