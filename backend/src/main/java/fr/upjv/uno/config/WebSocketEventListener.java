package fr.upjv.uno.config;

import fr.upjv.uno.service.GameService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/**
 * Permet d'écouter les events WebSocket, notamment les déconnexions STOMP.
 * Notifie le GameService si ça arrive.
 */
@Component
public class WebSocketEventListener {

  private final GameService gameService;

  /**
   * Constructeur.
   *
   * @param gameService service qui sera notifié en cas de déconnexion.
   */
  public WebSocketEventListener(GameService gameService) {
    this.gameService = gameService;
  }

  /**
   * Gère la connexion du joueur.
   * @param event Événement de connexion.
   */
  @EventListener
  public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
    StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
    String sessionId = headerAccessor.getSessionId();
    String destination = headerAccessor.getDestination();

    // destination de type : /topic/game/{gameId}/{playerId}
    if (sessionId != null && destination != null && destination.startsWith("/topic/game/")) {
      String[] parts = destination.split("/");
      if (parts.length >= 5) {
        String gameId = parts[3];
        String playerId = parts[4];
        gameService.connectPlayer(sessionId, gameId, playerId);
      }
    }
  }
  /**
   * Gère la déconnexion du joueur.
   *
   * @param event Événement de déconnexion.
   */
  @EventListener
  public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
    StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
    String sessionId = headerAccessor.getSessionId();
    if (sessionId != null) {
      gameService.disconnectPlayer(sessionId);
    }
  }
}