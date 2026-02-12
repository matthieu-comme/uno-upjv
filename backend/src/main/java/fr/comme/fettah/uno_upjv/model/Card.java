package fr.comme.fettah.uno_upjv.model;

import fr.comme.fettah.uno_upjv.model.enums.Color;
import fr.comme.fettah.uno_upjv.model.enums.Value;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Représente une carte du jeu UNO.
 *
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Card {
  private int id;
  private Color color;
  private Value value;

  /**
   * Indique si cette carte peut être jouée sur la carte visible au sommet de la défausse.
   * <p>
   * La jouabilité vérifie la correspondance des couleurs, des valeurs, ou si la carte jouée est un Joker.
   * </p>
   * <p>
   *
   * @param activeColor Couleur demandée.
   * @param activeValue Valeur demandée.
   * @return {@code true} si la carte est jouable, {@code false} sinon.
   */
  public boolean isPlayable(Color activeColor, Value activeValue) {
    if (this.color == Color.BLACK)
      return true;
    return this.color == activeColor || this.value == activeValue;
  }

  /**
   * @return
   */
  public int getPoints() {
    return value.getPoints();
  }
}
