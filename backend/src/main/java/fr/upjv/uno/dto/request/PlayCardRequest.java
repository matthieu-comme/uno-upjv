package fr.upjv.uno.dto.request;

import fr.upjv.uno.model.enums.Color;
import lombok.Data;

/**
 * Requête envoyée par le client pour jouer une carte pendant son tour.
 */
@Data
public class PlayCardRequest {
  private String playerId;
  private int cardId;
  private Color chosenColor; // pour les Jokers

}
