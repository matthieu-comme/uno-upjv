import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export function connectWebSocket(gameId, playerId, onGameUpdate, onError) {
  stompClient = new Client({
    webSocketFactory: () => new SockJS('/ws-uno-upjv'),
    onConnect: () => {
      stompClient.subscribe(`/topic/game/${gameId}/${playerId}`, (message) => {
        const gameState = JSON.parse(message.body);
        onGameUpdate(gameState);
      });
    },
    onStompError: (frame) => {
      console.error('WebSocket error', frame);
      onError?.(frame);
    },
  });

  stompClient.activate();
  return stompClient;
}

export function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}
