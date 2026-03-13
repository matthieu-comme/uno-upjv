package fr.upjv.uno.dto.response;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Représente les informations d'une carte envoyées au client.
 * Permet l'affichage direct sans logique côté frontend.
 */
@Data
@AllArgsConstructor
public class CardDTO {
  private int id;
  private Color color;
  private Value value;
}