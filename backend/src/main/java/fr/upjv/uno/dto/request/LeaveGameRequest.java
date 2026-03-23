package fr.upjv.uno.dto.request;

import lombok.Data;

/**
 * Requête envoyée par le client pour quitter la partie ou le lobby.
 */
@Data
public class LeaveGameRequest {
  private String playerId;
}