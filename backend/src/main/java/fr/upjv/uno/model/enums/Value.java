package fr.upjv.uno.model.enums;

/**
 * Représente la valeur d'une carte.
 * Le barème des points est centralisé ici.
 */
public enum Value {
  ZERO(0), ONE(1), TWO(2),
  THREE(3), FOUR(4), FIVE(5),
  SIX(6), SEVEN(7), EIGHT(8), NINE(9),
  SKIP(20), REVERSE(20), DRAW_TWO(20),
  WILD(50), WILD_DRAW_FOUR(50);

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
