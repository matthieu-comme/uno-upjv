package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Permet de tester unitairement la classe Card.
 */
public class CardTest {

  @Test
  @DisplayName("Carte doit être jouable si même couleur")
  void shouldBePlayableWhenSameColor() {
    Color activeColor = Color.RED;
    Value activeValue = Value.ONE;
    Card playedCard = new Card(2, Color.RED, Value.TWO);

    boolean result = playedCard.isPlayable(activeColor, activeValue);

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Carte doit être jouable si même valeur")
  void shouldBePlayableWhenSameValue() {
    Color activeColor = Color.RED;
    Value activeValue = Value.ONE;
    Card playedCard = new Card(2, Color.BLUE, Value.ONE);

    boolean result = playedCard.isPlayable(activeColor, activeValue);

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Un Joker doit toujours être jouable")
  void blackShouldAlwaysBePlayable() {

    Card playedCard = new Card(5, Color.BLACK, Value.WILD);

    boolean resultRed = playedCard.isPlayable(Color.RED, Value.ONE);
    boolean resultGreen = playedCard.isPlayable(Color.GREEN, Value.TWO);
    boolean resultBlue = playedCard.isPlayable(Color.BLUE, Value.THREE);
    boolean resultYellow = playedCard.isPlayable(Color.YELLOW, Value.FOUR);

    assertThat(resultRed).isTrue();
    assertThat(resultGreen).isTrue();
    assertThat(resultBlue).isTrue();
    assertThat(resultYellow).isTrue();

  }

  @Test
  @DisplayName("Carte ne doit pas être jouable car rien en commun")
  void shouldNotBePlayable() {
    Color activeColor = Color.RED;
    Value activeValue = Value.SKIP;
    Card playedCard = new Card(2, Color.BLUE, Value.DRAW_TWO);

    boolean result = playedCard.isPlayable(activeColor, activeValue);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("Carte numérique doit retourner son chiffre en points")
  void shouldReturnNumberValueInPoints() {

    Card[] card = new Card[10];
    card[0] = new Card(0, Color.RED, Value.ZERO);
    card[1] = new Card(1, Color.RED, Value.ONE);
    card[2] = new Card(2, Color.RED, Value.TWO);
    card[3] = new Card(3, Color.RED, Value.THREE);
    card[4] = new Card(4, Color.RED, Value.FOUR);
    card[5] = new Card(5, Color.RED, Value.FIVE);
    card[6] = new Card(6, Color.RED, Value.SIX);
    card[7] = new Card(7, Color.RED, Value.SEVEN);
    card[8] = new Card(8, Color.RED, Value.EIGHT);
    card[9] = new Card(9, Color.RED, Value.NINE);

    for (int i = 0; i < 10; i++)
      assertEquals(i, card[i].getPoints());
  }

  @Test
  @DisplayName("Cartes Action doivent retourner 20 points")
  void actionCardsShouldReturn20() {
    Card skip = new Card(1, Color.RED, Value.SKIP);
    Card reverse = new Card(2, Color.GREEN, Value.REVERSE);
    Card drawTwo = new Card(3, Color.BLUE, Value.DRAW_TWO);

    int skipPoints = skip.getPoints();
    int reversePoints = reverse.getPoints();
    int drawTwoPoints = drawTwo.getPoints();

    assertEquals(20, skipPoints);
    assertEquals(20, reversePoints);
    assertEquals(20, drawTwoPoints);
  }

  @Test
  @DisplayName("Cartes spéciales doivent retourner 50 points")
  void specialCardsShouldReturn50() {
    Card wild = new Card(1, Color.BLACK, Value.WILD);
    Card drawFour = new Card(2, Color.BLACK, Value.WILD_DRAW_FOUR);

    int wildPoints = wild.getPoints();
    int drawFourPoints = drawFour.getPoints();

    assertEquals(50, wildPoints);
    assertEquals(50, drawFourPoints);
  }
}
