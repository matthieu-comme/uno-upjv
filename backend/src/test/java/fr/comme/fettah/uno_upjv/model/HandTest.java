package fr.comme.fettah.uno_upjv.model;

import fr.comme.fettah.uno_upjv.model.enums.Color;
import fr.comme.fettah.uno_upjv.model.enums.Value;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Permet de tester unitairement la classe Hand.
 */
public class HandTest {

  @Test
  @DisplayName("La carte devrait être ajoutée")
  void shouldAddCard() {
    Hand hand = new Hand();
    Card card = new Card(1, Color.RED, Value.ONE);

    boolean result = hand.add(card);
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("La carte devrait être supprimée")
  void shouldRemoveCardWhenPresent() {
    Hand hand = new Hand();
    Card card = new Card(1, Color.RED, Value.ONE);
    hand.add(card);

    boolean result = hand.remove(card);
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("La carte ne devrait pas être supprimée car elle n'est pas dans la main")
  void shouldNotRemoveCardWhenAbsent() {
    Hand hand = new Hand();
    Card card = new Card(1, Color.RED, Value.ONE);

    boolean result = hand.remove(card);
    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("Le nombre de carte devrait être 0")
  void shouldCountEmptyHand() {
    Hand hand = new Hand();
    int result = hand.getCardCount();

    assertThat(result).isZero();
  }

  @Test
  @DisplayName("Le nombre de carte devrait être 99")
  void shouldCountLargeHand() {
    Hand hand = new Hand();

    for (int i = 0; i < 99; i++)
      hand.add(new Card(i, Color.RED, Value.ONE));

    int result = hand.getCardCount();

    assertThat(result).isEqualTo(99);
  }

  @Test
  @DisplayName("Le score devrait être 0")
  void pointsShouldEqual0() {
    Hand hand = new Hand();

    int result = hand.getPoints();
    assertThat(result).isEqualTo(0);

    hand.add(new Card(1, Color.RED, Value.ZERO));

    result = hand.getPoints();
    assertThat(result).isEqualTo(0);

  }

  @Test
  @DisplayName("Le score devrait être 77")
  void pointsShouldEqual77() {
    Hand hand = new Hand();

    hand.add(new Card(1, Color.BLACK, Value.WILD_DRAW_FOUR));
    hand.add(new Card(2, Color.RED, Value.SKIP));
    hand.add(new Card(3, Color.RED, Value.FIVE));
    hand.add(new Card(4, Color.RED, Value.TWO));

    int result = hand.getPoints();

    assertThat(result).isEqualTo(77);
  }

  @Test
  @DisplayName("Le score devrait être 500")
  void pointsShouldEqual500() {
    Hand hand = new Hand();

    for (int i = 0; i < 100; i++)
      hand.add(new Card(i, Color.RED, Value.FIVE));

    int result = hand.getPoints();

    assertThat(result).isEqualTo(500);
  }

  @Test
  @DisplayName("Au moins une carte devrait être jouable")
  void shouldHavePlayableCard() {
    Hand hand = new Hand();

    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));
    Card topCard = new Card(4, Color.RED, Value.ONE);

    boolean result = hand.hasPlayableCard(topCard);

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Aucune carte ne devrait être jouable")
  void shouldNotHavePlayableCard() {
    Hand hand = new Hand();

    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));
    Card topCard = new Card(4, Color.YELLOW, Value.NINE);

    boolean result = hand.hasPlayableCard(topCard);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("Aucune carte ne devrait être jouable (main vide)")
  void shouldNotHavePlayableCardWhenEmptyHand() {
    Hand hand = new Hand();
    Card topCard = new Card(1, Color.RED, Value.ONE);
    boolean result = hand.hasPlayableCard(topCard);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("La main devrait être vide")
  void shouldBeClearedHand() {
    Hand hand = new Hand();

    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    hand.clear();

    int result = hand.getCardCount();

    assertThat(result).isZero();
  }

  @Test
  @DisplayName("La carte devrait être trouvée")
  void cardShouldBeFound() {
    Hand hand = new Hand();

    hand.add(new Card(1, Color.RED, Value.TWO));
    Card expectedCard = new Card(2, Color.BLUE, Value.SKIP);
    hand.add(expectedCard);
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    Card result = hand.getCardById(2);

    assertThat(result).isEqualTo(expectedCard);
  }

  @Test
  @DisplayName("La carte ne devrait pas être trouvée (elle n'est pas dans la main)")
  void cardShouldNotBeFound() {
    Hand hand = new Hand();

    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    Card result = hand.getCardById(4);

    assertThat(result).isNull();
  }

  @Test
  @DisplayName("La carte ne devrait pas être trouvée (main vide)")
  void cardShouldNotBeFoundWhenEmptyHand() {
    Hand hand = new Hand();

    Card result = hand.getCardById(1);

    assertThat(result).isNull();
  }

  @Test
  @DisplayName("La main doit rester intacte lorsque la copie est clear")
  void shouldNotBeClearedWhenCopyIs() {
    Hand hand = new Hand();
    hand.add(new Card(1, Color.RED, Value.ONE));

    List<Card> copy = hand.getCards();
    copy.clear();

    assertThat(hand.getCardCount()).isEqualTo(1);
  }
}
