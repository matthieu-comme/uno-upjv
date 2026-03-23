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
  return response.json();
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
