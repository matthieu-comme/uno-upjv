const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/games`;
const PING_URL  = `${BASE_URL}/ping`;
const TIMEOUT_MS = 120_000;

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    const ct = response.headers.get('content-type');
    if (ct && ct.includes('application/json')) return response.json();
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Réveille le serveur silencieusement dès l'ouverture du site. */
export function ping() {
  fetch(PING_URL).catch(() => {});
}

export function createGame(maxPlayers, gameMode = 'STANDARD') {
  return request(`${BASE_URL}/create`, {
    method: 'POST',
    body: JSON.stringify({ maxPlayers, gameMode }),
  });
}

export function joinGame(gameId, playerName) {
  return request(`${BASE_URL}/${gameId}/join`, {
    method: 'POST',
    body: JSON.stringify({ playerName }),
  });
}

export function playCard(gameId, playerId, cardId, chosenColor = null) {
  return request(`${BASE_URL}/${gameId}/play`, {
    method: 'POST',
    body: JSON.stringify({ playerId, cardId, chosenColor }),
  });
}

export function drawCard(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/draw`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export function startGame(gameId) {
  return request(`${BASE_URL}/${gameId}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function leaveGame(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

/**
 * Récupère l'état courant d'une partie pour un joueur donné.
 * Requiert l'endpoint GET /api/games/{gameId}/state/{playerId} côté backend.
 */
export function getGameState(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/state/${playerId}`);
}

export function reconnectPlayer(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/reconnect/${playerId}`, { method: 'POST' });
}

// UNO et Contre-UNO utilisent le même endpoint.
// Le backend décide : si l'appelant a 1 carte → UNO annoncé,
// sinon → pénalité +2 sur les adversaires non protégés.
export function callUno(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/uno`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}
