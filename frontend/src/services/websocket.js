/**
 * Service WebSocket — connexion STOMP sur SockJS.
 * Gère la reconnexion automatique jusqu'à MAX_RECONNECTS tentatives.
 *
 * États rapportés via onStateChange :
 *   'connected'               — première connexion réussie
 *   'reconnected'             — rétabli après une coupure
 *   'reconnecting'(n, max)    — tentative n/max en cours
 *   'failed'                  — max tentatives atteint, abandon
 *   'error'                   — erreur STOMP non récupérable
 */

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Singleton — une seule connexion active à la fois
let stompClient   = null;
let intentionalClose = false;

const MAX_RECONNECTS = 5;

/**
 * Se connecte au WebSocket et s'abonne aux mises à jour de la partie.
 *
 * @param {string}   gameId        - ID de la partie
 * @param {string}   playerId      - ID du joueur
 * @param {Function} onGameUpdate  - appelé à chaque mise à jour de l'état de jeu
 * @param {Function} onStateChange - appelé quand le statut WS change (voir états ci-dessus)
 */
export function connectWebSocket(gameId, playerId, onGameUpdate, onStateChange) {
  intentionalClose = false;
  let reconnectCount = 0;

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${import.meta.env.VITE_WS_URL ?? ''}/ws-uno-upjv`),
    reconnectDelay: 3000, // délai entre chaque tentative de reconnexion automatique

    onConnect: () => {
      const wasReconnect = reconnectCount > 0;
      reconnectCount = 0;
      onStateChange?.(wasReconnect ? 'reconnected' : 'connected');

      // Ré-abonnement systématique à chaque (re)connexion
      stompClient.subscribe(`/topic/game/${gameId}/${playerId}`, (message) => {
        try {
          onGameUpdate(JSON.parse(message.body));
        } catch (e) {
          console.error('WS parse error', e);
        }
      });
    },

    onWebSocketClose: () => {
      if (intentionalClose) return; // fermeture volontaire — on ne reconnecte pas
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

/** Ferme proprement la connexion WebSocket (ne tente pas de reconnexion). */
export function disconnectWebSocket() {
  intentionalClose = true;
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}
