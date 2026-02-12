package fr.comme.fettah.uno_upjv.model;

import fr.comme.fettah.uno_upjv.model.enums.Color;
import fr.comme.fettah.uno_upjv.model.enums.Value;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;


/**
 * Permet de tester unitairement la classe Deck.
 */
public class DeckTest {

  /**
   * Crée de manière déterministe une liste de cartes de longueur variable.
   * Cette fonction est utilisée pour tester le deck.
   *
   * @param cardCount nombre de cartes souhaité.
   * @return liste de cartes.
   */
  private List<Card> createCardList(int cardCount) {
    ArrayList<Card> cards = new ArrayList<>();
    Color[] mainColors = {Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW};
    Value[] allValues = Value.values();

    for (int i = 0; i < cardCount; i++) {
      Value value = allValues[i % allValues.length];
      Color color;

      if (value == Value.WILD || value == Value.WILD_DRAW_FOUR)
        color = Color.BLACK;
      else
        color = mainColors[i % 4];

      cards.add(new Card(i, color, value));
    }

    return cards;
  }

  @Test
  @DisplayName("Le nombre de carte devrait être 0")
  void shouldCountEmptyDeck() {
    Deck deck = new Deck();
    int result = deck.getCardCount();

    assertThat(result).isZero();
  }


  @Test
  @DisplayName("Le deck doit être rempli.")
  void shouldRefill() {
    Deck deck = new Deck();
    List<Card> refillCards = createCardList(20);

    boolean result = deck.refill(refillCards);

    assertThat(result).isTrue();
    assertThat(deck.getCardCount()).isEqualTo(20);
    assertThat(deck.getCards()).containsExactlyElementsOf(refillCards);
  }

  @Test
  @DisplayName("Le deck ne doit pas changer lorsque la liste est nulle.")
  void shouldNotRefillWhenListIsNull() {
    Deck deck = new Deck(createCardList(10));
    List<Card> copy = deck.getCards();

    boolean result = deck.refill(null);

    assertThat(result).isEqualTo(false);
    assertThat(deck.getCards()).containsExactlyElementsOf(copy);
  }

  @Test
  @DisplayName("Le deck ne doit pas changer lorsque la liste est vide.")
  void shouldNotRefillWhenListIsEmpty() {
    Deck deck = new Deck(createCardList(10));
    List<Card> copy = deck.getCards();
    List<Card> refillCards = new ArrayList<>();

    boolean result = deck.refill(refillCards);

    assertThat(result).isEqualTo(false);
    assertThat(deck.getCards()).containsExactlyElementsOf(copy);
  }

  @Test
  @DisplayName("Le nombre de carte devrait être 99")
  void shouldCountLargeDeck() {
    Deck deck = new Deck(createCardList(99));

    int result = deck.getCardCount();

    assertThat(result).isEqualTo(99);
  }

  @Test
  @DisplayName("Le deck doit rester intacte lorsque la copie est clear")
  void shouldNotBeClearedWhenCopyIs() {
    Deck deck = new Deck(createCardList(50));

    List<Card> copy = deck.getCards();
    copy.clear();

    assertThat(deck.getCardCount()).isEqualTo(50);
  }

  @Test
  @DisplayName("Le deck devrait être mélangé")
  void shouldShuffle() {
    Deck deck = new Deck(createCardList(200));
    List<Card> copy = deck.getCards();

    deck.shuffle();

    assertThat(deck.getCardCount()).isEqualTo(copy.size());
    assertThat(deck.getCards()).containsExactlyInAnyOrderElementsOf(copy);
    assertThat(deck.getCards()).isNotEqualTo(copy);
  }

  @Test
  @DisplayName("La carte devrait être piochée")
  void shouldDraw() {
    Deck deck = new Deck(createCardList(4));
    Card expectedCard = new Card(3, Color.YELLOW, Value.THREE); // cf createCardList

    Card drawnCard = deck.draw();

    assertThat(deck.getCardCount()).isEqualTo(3);
    assertThat(drawnCard).isEqualTo(expectedCard);
  }

  @Test
  @DisplayName("Ne devrait pas piocher car deck vide")
  void shouldNotDrawWhenEmptyDeck() {
    Deck deck = new Deck();

    Card drawnCard = deck.draw();

    assertThat(deck.getCardCount()).isEqualTo(0);
    assertThat(drawnCard).isNull();
  }
}
