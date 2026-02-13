package fr.upjv.uno.factory;

import fr.upjv.uno.model.Card;
import fr.upjv.uno.model.Deck;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Permet de tester unitairement la classe DeckFactory.
 */
public class DeckFactoryTest {

  private Deck deck;

  @BeforeEach
  void setup() {
    deck = new DeckFactory().createStandardDeck();
  }

  private long countCards(List<Card> cards, Color color, Value value) {
    return cards.stream()
            .filter(c -> c.getColor() == color && c.getValue() == value)
            .count();
  }

  @Test
  @DisplayName("Le deck doit compter 108 cartes.")
  void shouldHave108Cards() {
    assertThat(deck.getCards()).hasSize(108);
  }

  @Test
  @DisplayName("Il doit y avoir 8 cartes noires (4 jokers et 4 +4")
  void shouldHaveAllBlackCards() {
    long wildCount = countCards(deck.getCards(), Color.BLACK, Value.WILD);
    long drawFourCount = countCards(deck.getCards(), Color.BLACK, Value.WILD_DRAW_FOUR);

    assertThat(wildCount).isEqualTo(4);
    assertThat(drawFourCount).isEqualTo(4);
  }

  @ParameterizedTest(name = "La couleur {0} doit avoir un seul zéro")
  @EnumSource(value = Color.class, names = {"RED", "BLUE", "GREEN", "YELLOW"})
  void shouldHaveSingleZero(Color color) {
    long zeroCount = countCards(deck.getCards(), color, Value.ZERO);

    assertThat(zeroCount).as("Erreur: carte 0 %s", color).isEqualTo(1);
  }

  @ParameterizedTest(name = "La couleur {0} doit avoir deux exemplaires des cartes 1-9 et actions")
  @EnumSource(value = Color.class, names = {"RED", "BLUE", "GREEN", "YELLOW"})
  void shouldHaveDoubleCardsForRegularValues(Color color) {
    for (Value value : Value.values()) {

      if (value == Value.ZERO || value == Value.WILD || value == Value.WILD_DRAW_FOUR)
        continue;

      long count = countCards(deck.getCards(), color, value);

      assertThat(count)
              .as("Erreur: carte %s %s", color, value)
              .isEqualTo(2);
    }
  }

}
