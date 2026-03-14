package fr.upjv.uno.dto.request;

import lombok.Data;

/**
 * Requête envoyée par le client pour rejoindre une partie existante.
 */
@Data
public class JoinGameRequest {
  private String playerName;
}
