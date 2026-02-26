package fr.upjv.uno.model.enums;

/**
 * Représente la valeur d'une carte.
 * Le barème des points est centralisé ici.
 */
public enum Value {
  /**
   * Valeur 0
   */
  ZERO(0),
  /**
   * Valeur 1
   */
  ONE(1),
  /**
   * Valeur 2
   */
  TWO(2),
  /**
   * Valeur 3
   */
  THREE(3),
  /**
   * Valeur 4
   */
  FOUR(4),
  /**
   * Valeur 5
   */
  FIVE(5),
  /**
   * Valeur 6
   */
  SIX(6),
  /**
   * Valeur 7
   */
  SEVEN(7),
  /**
   * Valeur 8
   */
  EIGHT(8),
  /**
   * Valeur 9
   */
  NINE(9),
  /**
   * Action "Passer le tour" vaut 20 points
   */
  SKIP(20),
  /**
   * Action "Inverser" vaut 20 points
   */
  REVERSE(20),
  /**
   * Action "+2" vaut 20 points
   */
  DRAW_TWO(20),
  /**
   * Action "Joker" vaut 50 points
   */
  WILD(50),
  /**
   * Action "+4" vaut 50 points
   */
  WILD_DRAW_FOUR(50);

  private final int points;

  Value(int points) {
    this.points = points;
  }

  /**
   * Retourne le nombre de points associé à cette valeur selon les règles officielles.
   * <ul>
   *   <li>Chiffres 0-9 : sa valeur (0 à 9 points).</li>
   *   <li>Cartes Action (Reverse, Skip, +2) : 20 points.</li>
   *   <li>Cartes Spéciales (Wild, +4) : 50 points</li>
   * </ul>
   *
   * @return le nombre de points de cette valeur.
   */
  public int getPoints() {
    return points;
  }
}
