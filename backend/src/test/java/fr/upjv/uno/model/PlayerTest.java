package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Permet de tester unitairement la classe Player.
 */
public class PlayerTest {
  private Player player;

  // Helper pour créer une carte bidon rapidement
  private Card createDummyCard() {
    return new Card(1, Color.RED, Value.FIVE);
  }

  @BeforeEach
  void setup() {
    player = new Player("1234", "Toto");
  }

  @Test
  @DisplayName("Le constructeur doit initialiser correctement le joueur et sa main")
  void shouldBeInitializePlayer() {
    String id = "1234";
    String name = "Toto";

    Player player = new Player(id, name);

    assertThat(player.getId()).isEqualTo(id);
    assertThat(player.getName()).isEqualTo(name);
    assertThat(player.isConnected()).isTrue();
    assertThat(player.getHand()).isNotNull();
    assertThat(player.getHand().getCards()).isEmpty();
  }

  @Test
  @DisplayName("Deux joueurs devraient être égaux s'ils ont le même id")
  void shouldBeEqualWhenSameId() {
    Player playerA = new Player("1234", "Toto");
    Player playerB = new Player("1234", "Titi");

    assertThat(playerA).isEqualTo(playerB);
    assertThat(playerA.hashCode()).isEqualTo(playerB.hashCode());
  }

  @Test
  @DisplayName("Deux joueurs ne devraient être égaux s'ils ont un id différent")
  void shouldNotBeEqualWhenDifferentId() {
    Player playerA = new Player("1234", "Toto");
    Player playerB = new Player("99", "Toto");

    assertThat(playerA).isNotEqualTo(playerB);
  }

  @Test
  @DisplayName("drawCard doit ajouter la carte dans la main")
  void shouldDrawCardCorrectly() {
    Card card = createDummyCard();

    player.drawCard(card);

    assertThat(player.getHandSize()).isEqualTo(1);
    assertThat(player.hasEmptyHand()).isFalse();
    assertThat(player.getHand().getCards()).containsExactly(card);
  }

  @Test
  @DisplayName("drawCard doit refuser une carte null")
  void shouldThrowExceptionWhenDrawingNull() {
    assertThatThrownBy(() -> player.drawCard(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("On ne peut pas piocher une carte nulle");
  }

  @Test
  @DisplayName("playCard doit retirer la carte de la main")
  void shouldPlayCardCorrectly() {
    Card card = createDummyCard();

    player.drawCard(card);

    player.playCard(card);

    assertThat(player.hasEmptyHand()).isTrue();
    assertThat(player.getHandSize()).isZero();
  }

  @Test
  @DisplayName("playCard doit lancer une exception si le joueur n'a pas la carte")
  void shouldThrowExceptionWhenPlayingMissingCard() {
    Card iDontHave = createDummyCard();

    assertThatThrownBy(() -> player.playCard(iDontHave))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("essaie de jouer une carte qu'il n'a pas");
  }

  @Test
  @DisplayName("État : main vide")
  void shouldHandleEmptyHandState() {
    assertThat(player.getHandSize()).isZero();
    assertThat(player.hasEmptyHand()).isTrue();
    assertThat(player.hasUno()).isFalse();
  }

  @Test
  @DisplayName("État UNO : exactement 1 carte")
  void shouldDetectUno() {
    player.drawCard(createDummyCard());

    assertThat(player.getHandSize()).isEqualTo(1);
    assertThat(player.hasUno()).isTrue();
    assertThat(player.hasEmptyHand()).isFalse();
  }

  @Test
  @DisplayName("État normal : plusieurs cartes")
  void shouldHandleMultipleCards() {
    player.drawCard(createDummyCard());
    player.drawCard(createDummyCard()); // 2 cartes

    assertThat(player.getHandSize()).isEqualTo(2);
    assertThat(player.hasUno()).isFalse();
    assertThat(player.hasEmptyHand()).isFalse();
  }
  @Test
  @DisplayName("La carte devrait être trouvée")
  void cardShouldBeFound() {
    player.drawCard(new Card(1, Color.RED, Value.TWO));
    Card expectedCard = new Card(2, Color.BLUE, Value.SKIP);
    player.drawCard(expectedCard);
    player.drawCard(new Card(3, Color.GREEN, Value.REVERSE));

    boolean result = player.hasThisCard(expectedCard);

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Doit retourner vrai pour une nouvelle instance identique")
  void shouldReturnTrueForEquivalentCardInstance() {
    player.drawCard(new Card(1, Color.RED, Value.FIVE));

    Card equivalentCard = new Card(1, Color.RED, Value.FIVE);

    boolean result = player.hasThisCard((equivalentCard));

    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("La carte ne devrait pas être trouvée (elle n'est pas dans la main)")
  void cardShouldNotBeFound() {
    player.drawCard(new Card(1, Color.RED, Value.TWO));
    player.drawCard(new Card(2, Color.BLUE, Value.SKIP));
    player.drawCard(new Card(3, Color.GREEN, Value.REVERSE));

    Card absent = new Card(4, Color.BLACK, Value.WILD_DRAW_FOUR);

    boolean result = player.hasThisCard(absent);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("La carte ne devrait pas être trouvée (main vide)")
  void cardShouldNotBeFoundWhenEmptyHand() {
    Card card = new Card(1, Color.RED, Value.TWO);

    boolean result = player.hasThisCard(card);

    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("La main doit rester intacte lorsque la copie est clear")
  void shouldNotBeClearedWhenCopyIs() {
    player.drawCard(new Card(1, Color.RED, Value.ONE));

    List<Card> copy = player.getCards();
    copy.clear();

    assertThat(player.getHandSize()).isEqualTo(1);
  }


}
