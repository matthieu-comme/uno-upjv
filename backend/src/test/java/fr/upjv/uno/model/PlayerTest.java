package fr.upjv.uno.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Permet de tester unitairement la classe Player.
 */
public class PlayerTest {

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
}
