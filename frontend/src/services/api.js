const BASE_URL = '/api/games';

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  const ct = response.headers.get('content-type');
  if (ct && ct.includes('application/json')) {
    return response.json();
  }
  return null;
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

export function callUno(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/callUno`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export function counterUno(gameId, callerId, targetId) {
  return request(`${BASE_URL}/${gameId}/counterUno`, {
    method: 'POST',
    body: JSON.stringify({ callerId, targetId }),
  });
}
