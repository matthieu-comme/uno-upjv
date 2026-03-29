package fr.upjv.uno.dto.response;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.GameStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Représente l'état global de la partie à un instant T.
 * Envoyé aux clients pour synchroniser l'affichage de l'interface de jeu.
 */
@Data
@Builder
public class GameStateDTO {
  private String gameId;
  private GameStatus status;
  private int direction;
  private Color activeColor;
  private CardDTO topCard;
  private int currentPlayerIndex;
  private List<PlayerDTO> players;
  private int deckSize;

  private int rematchVotes;
  private int rematchNeeded;
  private boolean rematchExpired;

  /** Cartes possédées par le joueur qui reçoit ce DTO. */
  private List<CardDTO> myHand;
}