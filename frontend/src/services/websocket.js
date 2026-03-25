import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;
let intentionalClose = false;

const MAX_RECONNECTS = 5;

/**
 * Connecte au WebSocket et gère la reconnexion automatique.
 *
 * @param {string}   gameId        - ID de la partie
 * @param {string}   playerId      - ID du joueur
 * @param {Function} onGameUpdate  - appelé à chaque mise à jour de l'état
 * @param {Function} onStateChange - appelé quand le statut change :
 *   ('connected') | ('reconnecting', attempt, max) | ('failed') | ('error')
 */
export function connectWebSocket(gameId, playerId, onGameUpdate, onStateChange) {
  intentionalClose = false;
  let reconnectCount = 0;

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${import.meta.env.VITE_WS_URL ?? ''}/ws-uno-upjv`),
    reconnectDelay: 3000,

    onConnect: () => {
      const wasReconnect = reconnectCount > 0;
      reconnectCount = 0;
      onStateChange?.(wasReconnect ? 'reconnected' : 'connected');

      // Ré-abonnement à chaque (re)connexion
      stompClient.subscribe(`/topic/game/${gameId}/${playerId}`, (message) => {
        try {
          onGameUpdate(JSON.parse(message.body));
        } catch (e) {
          console.error('WS parse error', e);
        }
      });
    },

    onWebSocketClose: () => {
      if (intentionalClose) return;
      reconnectCount++;
      if (reconnectCount > MAX_RECONNECTS) {
        intentionalClose = true;
        stompClient?.deactivate();
        stompClient = null;
        onStateChange?.('failed');
        return;
      }
      onStateChange?.('reconnecting', reconnectCount, MAX_RECONNECTS);
    },

    onStompError: (frame) => {
      console.error('WS STOMP error', frame);
      onStateChange?.('error');
    },
  });

  stompClient.activate();
  return stompClient;
}

export function disconnectWebSocket() {
  intentionalClose = true;
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}
