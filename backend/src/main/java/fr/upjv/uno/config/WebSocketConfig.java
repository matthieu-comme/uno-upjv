package fr.upjv.uno.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuration du serveur WebSocket pour la communication bidirectionnelle en temps réel via le protocole STOMP.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  /**
   * Configure le message broker en mémoire.
   * Définit les préfixes de destination pour le routage des messages entrants et sortants.
   *
   * @param config Le registre de configuration du routeur de messages.
   */
  @Override
  public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableSimpleBroker("/topic");
    config.setApplicationDestinationPrefixes("/app");
  }

  /**
   * Enregistre le point de terminaison (endpoint) principal d'accroche pour les clients WebSocket.
   * Configure également les origines CORS spécifiques à cette connexion et active SockJS comme solution de repli.
   *
   * @param registry Le registre permettant d'ajouter et configurer les endpoints STOMP.
   */
  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws-uno-upjv")
            .setAllowedOriginPatterns("http://localhost:3000", "http://localhost:5173")
            .withSockJS();
  }
}