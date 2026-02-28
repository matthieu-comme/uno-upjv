package fr.upjv.uno.factory;

import fr.upjv.uno.model.Card;
import fr.upjv.uno.model.Deck;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Permet de fabriquer des Deck prédéfinis.
 * Utile si nous voulons ajouter différentes règles nécessitant une autre composition de pioche.
 */
@Component
@NoArgsConstructor
public class DeckFactory {
  /**
   * Fabrique un deck selon les règles officielles du Uno.
   * <p>Composé de 108 cartes. Pour chaque couleur principale :</p>
   * <ul>
   *   <li>1 carte 0.</li>
   *   <li>2 cartes pour chaque chiffre de 1 à 9.</li>
   *   <li>2 cartes +2, SKIP et REVERSE</li>
   * </ul>
   * <p>Soit 25 cartes par couleur → 100 cartes de couleur principale.</p>
   * <p>Il reste 4 Joker et 4 +4 pour faire 108.</p>
   *
   * @return un Deck pour jouer une partie standard.
   */
  public Deck createStandardDeck() {
    List<Card> cards = new ArrayList<>();
    Color[] mainColors = {Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW};
    int idCounter = 1;

    // crée les cartes des couleurs principales.
    for (Color mainColor : mainColors) {
      // le 0
      cards.add(new Card(idCounter++, mainColor, Value.ZERO));

      // ajoute deux exemplaires de (1-9) et actions.
      for (Value value : Value.values()) {
        if (value == Value.ZERO || value == Value.WILD || value == Value.WILD_DRAW_FOUR)
          continue;

        for (int i = 0; i < 2; i++)
          cards.add(new Card(idCounter++, mainColor, value));
      }
    }

    for (int i = 0; i < 4; i++) // joker
      cards.add(new Card(idCounter++, Color.BLACK, Value.WILD));

    for (int i = 0; i < 4; i++) // +4
      cards.add(new Card(idCounter++, Color.BLACK, Value.WILD_DRAW_FOUR));

    return new Deck(cards);
  }
}
