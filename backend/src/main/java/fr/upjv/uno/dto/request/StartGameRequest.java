package fr.upjv.uno.dto.request;

import lombok.Data;

/**
 * Requête envoyée par le client pour démarrer la partie depuis le lobby.
 */
@Data
public class StartGameRequest {
  private String playerId;
}