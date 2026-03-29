/**
 * Service API REST — toutes les communications HTTP avec le backend.
 * Base URL : VITE_API_URL (env) + /api/games
 */

const BASE_URL  = `${import.meta.env.VITE_API_URL ?? ''}/api/games`;
const PING_URL  = `${BASE_URL}/ping`;
const TIMEOUT_MS = 120_000; // 2 min — délai généreux pour le réveil du serveur Render

/**
 * Wrapper fetch avec timeout automatique et gestion d'erreur HTTP.
 * Retourne le JSON parsé ou null si la réponse est vide.
 */
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

/** Réveille le serveur silencieusement dès l'ouverture du site (Render free tier). */
export function ping() {
  fetch(PING_URL).catch(() => {});
}

/** Crée une nouvelle partie. Retourne { gameId }. */
export function createGame(maxPlayers, gameMode = 'STANDARD') {
  return request(`${BASE_URL}/create`, {
    method: 'POST',
    body: JSON.stringify({ maxPlayers, gameMode }),
  });
}

/** Ajoute un joueur à la partie. Retourne l'état du lobby (liste des joueurs). */
export function joinGame(gameId, playerName) {
  return request(`${BASE_URL}/${gameId}/join`, {
    method: 'POST',
    body: JSON.stringify({ playerName }),
  });
}

/** Joue une carte. chosenColor requis pour Wild/+4. */
export function playCard(gameId, playerId, cardId, chosenColor = null) {
  return request(`${BASE_URL}/${gameId}/play`, {
    method: 'POST',
    body: JSON.stringify({ playerId, cardId, chosenColor }),
  });
}

/** Pioche une carte depuis le deck. */
export function drawCard(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/draw`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

/** Lance la partie (hôte uniquement). Les places vides seront remplies par des bots. */
export function startGame(gameId) {
  return request(`${BASE_URL}/${gameId}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Quitte la partie. Un bot prend la place du joueur. */
export function leaveGame(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

/**
 * Récupère l'état courant de la partie pour un joueur donné.
 * Utilisé en reconnexion et en polling (tour d'un bot).
 */
export function getGameState(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/state/${playerId}`);
}

/** Signale au backend le retour d'un joueur après fermeture d'onglet. */
export function reconnectPlayer(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/reconnect/${playerId}`, { method: 'POST' });
}

/**
 * Appel UNO / Contre-UNO — même endpoint, le backend décide :
 * - Si l'appelant a 1 carte → UNO annoncé (protection)
 * - Sinon → contre-UNO (+2 cartes sur les adversaires non protégés)
 */
export function callUno(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/uno`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

/** Vote pour rejouer après la fin de la partie. La partie repart si tous les humains votent. */
export function voteRematch(gameId, playerId) {
  return request(`${BASE_URL}/${gameId}/rematch`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}
