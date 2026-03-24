package fr.upjv.uno.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * Représente les informations publiques d'un joueur,
 * donc pas de cartes pour éviter la triche.
 */
@Data
@Builder
public class PlayerDTO {
  private String id;
  private String name;
  private boolean isConnected;
  private int handSize;
  private boolean isUnoCalled;
}