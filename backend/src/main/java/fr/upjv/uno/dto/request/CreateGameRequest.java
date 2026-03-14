package fr.upjv.uno.dto.request;

import lombok.Data;

/**
 * Requête envoyée par le client pour créer une nouvelle partie.
 */
@Data
public class CreateGameRequest {
  private int maxPlayers;
  private String gameMode;
}
