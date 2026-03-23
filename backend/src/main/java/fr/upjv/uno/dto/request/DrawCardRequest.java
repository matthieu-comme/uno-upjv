package fr.upjv.uno.dto.request;

import lombok.Data;

/**
 * Requête envoyée par le client pour piocher une carte volontairement pendant son tour.
 */
@Data
public class DrawCardRequest {
  private String playerId;
}