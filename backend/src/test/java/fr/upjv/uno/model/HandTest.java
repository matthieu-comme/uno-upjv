package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Permet de tester unitairement la classe Hand.
 */
public class HandTest {
  private Hand hand;

  @BeforeEach
  void setup() {
    hand = new Hand();
  }

  @Test
  @DisplayName("La carte devrait être ajoutée")
  void shouldAddCard() {
    Card card = new Card(1, Color.RED, Value.ONE);

    hand.add(card);

    assertThat(hand.getCards()).containsExactly(card);
    assertThat(hand.getSize()).isEqualTo(1);
  }

  @Test
  @DisplayName("La carte devrait être supprimée")
  void shouldRemoveCardWhenPresent() {
    Card card = new Card(1, Color.RED, Value.ONE);
    hand.add(card);

    boolean result = hand.remove(card);

    assertThat(result).isTrue();
    assertThat(hand.isEmpty()).isTrue();
  }

  @Test
  @DisplayName("La carte ne devrait pas être supprimée car elle n'est pas dans la main")
  void shouldNotRemoveCardWhenAbsent() {
    Card card = new Card(1, Color.RED, Value.ONE);

    boolean result = hand.remove(card);

    assertThat(result).isFalse();
    assertThat(hand.isEmpty()).isTrue();
  }

  @Test
  @DisplayName("Le nombre de carte devrait être 0")
  void shouldCountEmptyHand() {
    assertThat(hand.getSize()).isZero();
  }

  @Test
  @DisplayName("La main devrait etre vide")
  void shouldBeEmpty() {
    assertThat(hand.isEmpty()).isTrue();
  }

  @Test
  @DisplayName("Le main ne devrait pas être vide")
  void shouldNotBeEmpty() {
    hand.add(new Card(1, Color.RED, Value.ONE));

    assertThat(hand.isEmpty()).isFalse();
  }

  @Test
  @DisplayName("Le nombre de carte devrait être 99")
  void shouldCountLargeHand() {
    for (int i = 0; i < 99; i++)
      hand.add(new Card(i, Color.RED, Value.ONE));

    int result = hand.getSize();

    assertThat(result).isEqualTo(99);
  }

  @Test
  @DisplayName("Le score devrait être 0")
  void pointsShouldEqual0() {
    int result = hand.getPoints();
    assertThat(result).isEqualTo(0);

    hand.add(new Card(1, Color.RED, Value.ZERO));

    result = hand.getPoints();
    assertThat(result).isEqualTo(0);
  }

  @Test
  @DisplayName("Le score devrait être 77")
  void pointsShouldEqual77() {
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
    for (int i = 0; i < 100; i++)
      hand.add(new Card(i, Color.RED, Value.FIVE));

    int result = hand.getPoints();

    assertThat(result).isEqualTo(500);
  }

  @Test
  @DisplayName("Au moins une carte devrait être jouable")
  void shouldHavePlayableCard() {
    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    boolean result = hand.hasPlayableCard(Color.RED, Value.ONE);

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Aucune carte ne devrait être jouable")
  void shouldNotHavePlayableCard() {
    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    boolean result = hand.hasPlayableCard(Color.YELLOW, Value.NINE);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("Aucune carte ne devrait être jouable (main vide)")
  void shouldNotHavePlayableCardWhenEmptyHand() {
    boolean result = hand.hasPlayableCard(Color.RED, Value.ONE);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("La main devrait être vide après un clear")
  void shouldBeClearedHand() {
    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    hand.clear();

    int result = hand.getSize();

    assertThat(result).isZero();
  }

  @Test
  @DisplayName("La carte devrait être trouvée")
  void cardShouldBeFound() {
    hand.add(new Card(1, Color.RED, Value.TWO));
    Card expectedCard = new Card(2, Color.BLUE, Value.SKIP);
    hand.add(expectedCard);
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    boolean result = hand.contains(expectedCard);

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Doit retourner vrai pour une nouvelle instance identique")
  void shouldReturnTrueForEquivalentCardInstance() {
    hand.add(new Card(1, Color.RED, Value.FIVE));

    Card equivalentCard = new Card(1, Color.RED, Value.FIVE);

    assertThat(hand.contains(equivalentCard)).isTrue();
  }

  @Test
  @DisplayName("La carte ne devrait pas être trouvée (elle n'est pas dans la main)")
  void cardShouldNotBeFound() {
    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    Card absent = new Card(4, Color.BLACK, Value.WILD_DRAW_FOUR);

    boolean result = hand.contains(absent);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("La carte ne devrait pas être trouvée (main vide)")
  void cardShouldNotBeFoundWhenEmptyHand() {
    Card card = new Card(1, Color.RED, Value.TWO);

    boolean result = hand.contains(card);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("La main doit rester intacte lorsque la copie est clear")
  void shouldNotBeClearedWhenCopyIs() {
    hand.add(new Card(1, Color.RED, Value.ONE));

    List<Card> copy = hand.getCards();
    copy.clear();

    assertThat(hand.getSize()).isEqualTo(1);
  }

  @Test
  @DisplayName("Doit retourner les cartes de même couleur, même valeur et les Jokers")
  void shouldReturnAllMatchingCards() {
    Color activeColor = Color.RED;
    Value activeValue = Value.FIVE;

    Card matchingColor = new Card(1, Color.RED, Value.SKIP);
    Card matchingValue = new Card(2, Color.BLUE, Value.FIVE);
    Card wild = new Card(3, Color.BLACK, Value.WILD);
    Card wild4 = new Card(4, Color.BLACK, Value.WILD_DRAW_FOUR);
    Card wrong = new Card(5, Color.GREEN, Value.NINE);

    hand.add(matchingColor);
    hand.add(matchingValue);
    hand.add(wild);
    hand.add(wild4);
    hand.add(wrong);

    List<Card> result = hand.getPlayableCards(activeColor, activeValue);

    assertThat(result).containsExactly(matchingColor, matchingValue, wild, wild4);
    assertThat(result).doesNotContain(wrong);
  }

  @Test
  @DisplayName("La liste de cartes jouables doit être vide")
  void shouldReturnEmptyListWhenNoPlayableCard() {
    hand.add(new Card(1, Color.RED, Value.TWO));
    hand.add(new Card(2, Color.BLUE, Value.SKIP));
    hand.add(new Card(3, Color.GREEN, Value.REVERSE));

    List<Card> playableCards = hand.getPlayableCards(Color.YELLOW, Value.NINE);

    assertThat(playableCards).isEmpty();
  }
}
