package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Permet de tester unitairement la classe DiscardPile.
 */
public class DiscardPileTest {

  private DiscardPile discardPile;

  @BeforeEach
  void setup() {
    discardPile = new DiscardPile();
  }

  @Test
  @DisplayName("La défausse doit être vide à l'initialisation")
  void shouldBeEmptyInitially() {
    assertThat(discardPile.isEmpty()).isTrue();
    assertThat(discardPile.getTopCard()).isNull();
  }

  @Test
  @DisplayName("Ajouter une carte doit la rendre visible au sommet")
  void shouldAddCard() {
    Card c1 = new Card(1, Color.RED, Value.FIVE);
    discardPile.add(c1);

    assertThat(discardPile.isEmpty()).isFalse();
    assertThat(discardPile.getTopCard()).isEqualTo(c1);
  }

  @Test
  @DisplayName("Le sommet doit toujours correspondre à la dernière carte ajoutée")
  void shouldReturnCorrectTopCard() {
    Card c1 = new Card(1, Color.RED, Value.FIVE);
    Card c2 = new Card(2, Color.BLUE, Value.TWO);

    discardPile.add(c1);
    assertThat(discardPile.getTopCard()).isEqualTo(c1);

    discardPile.add(c2);
    assertThat(discardPile.getTopCard()).isEqualTo(c2);
  }

  @Test
  @DisplayName("extractAllButTopCard doit vider la pile sauf le sommet")
  void shouldExtractAllButTop() {
    Card c1 = new Card(1, Color.RED, Value.ONE);
    Card c2 = new Card(2, Color.RED, Value.TWO);
    Card topCard = new Card(3, Color.RED, Value.THREE);

    discardPile.add(c1);
    discardPile.add(c2);
    discardPile.add(topCard);

    List<Card> extracted = discardPile.extractAllButTopCard();

    assertThat(discardPile.isEmpty()).isFalse();
    assertThat(discardPile.getTopCard()).isEqualTo(topCard);
    assertThat(discardPile.getCards()).containsExactly(topCard);


    assertThat(extracted).containsExactly(c1, c2);
    assertThat(extracted).doesNotContain(topCard);
  }

  @Test
  @DisplayName("Extraction sur une pile à 1 carte ne doit rien renvoyer")
  void shouldReturnEmptyListWhenOnlyOneCard() {
    Card c1 = new Card(1, Color.RED, Value.ONE);

    discardPile.add(c1);

    List<Card> extracted = discardPile.extractAllButTopCard();

    assertThat(extracted).isEmpty();
    assertThat(discardPile.getCards()).containsExactly(c1);
  }

  @Test
  @DisplayName("Extraction sur une pile vide doit renvoyer une liste vide")
  void shouldHandleEmptyPileExtraction() {
    List<Card> extracted = discardPile.extractAllButTopCard();

    assertThat(extracted).isEmpty();
    assertThat(discardPile.isEmpty()).isTrue();
  }
}
