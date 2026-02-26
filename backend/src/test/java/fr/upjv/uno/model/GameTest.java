package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.GameStatus;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

/**
 * Permet de tester unitairement la classe Game.
 */
public class GameTest {
  private Game game;
  private String id;
  private Deck deck;
  private int maxPlayers;

  @BeforeEach
  void setup() {
    id = "1234";
    deck = new Deck();
    maxPlayers = 4;
    game = new Game(id, deck, maxPlayers);
  }

  private void addPlayers(int n) {
    for (int i = 1; i <= n; i++) {
      game.addPlayer(new Player("" + i, "Joueur " + i));
    }
  }

  @Test
  @DisplayName("Le constructeur doit initialiser correctement tous les attributs")
  void shouldInitializeGame() {
    assertThat(game.getId()).isEqualTo(id);
    assertThat(game.getDeck()).isEqualTo(deck);
    assertThat(game.getMaxPlayers()).isEqualTo(maxPlayers);

    assertThat(game.getStatus()).isEqualTo(GameStatus.WAITING_FOR_PLAYERS);
    assertThat(game.getDirection()).isEqualTo(1);
    assertThat(game.getPlayers()).isEmpty();
    assertThat(game.getCurrentPlayerIndex()).isZero();
    assertThat(game.getDiscardPile()).isNotNull();
  }

  @Test
  @DisplayName("La liste des joueurs doit rester intacte lorsque la copie est clear")
  void shouldNotBeClearedWhenCopyIs() {
    game.addPlayer(new Player("1", "Toto"));
    List<Player> copy = game.getPlayers();
    copy.clear();

    assertThat(game.getPlayersNumber()).isEqualTo(1);
  }

  @Test
  @DisplayName("reverseDirection doit passer la direction de 1 à -1")
  void shouldReverseDirectionToNegative() {
    game.reverseDirection();
    assertThat(game.getDirection()).isEqualTo(-1);
  }

  @Test
  @DisplayName("reverseDirection appelée deux fois doit ramener la direction à 1")
  void shouldReverseDirectionTwiceToPositive() {
    game.reverseDirection();
    game.reverseDirection();
    assertThat(game.getDirection()).isEqualTo(1);
  }

  @Test
  @DisplayName("Doit incrémenter l'index dans le sens horaire")
  void shouldUpdateIndexClockwise() {
    addPlayers(3);

    game.updateCurrentPlayerIndex();

    assertThat(game.getCurrentPlayerIndex()).isEqualTo(1);
  }

  @Test
  @DisplayName("Doit revenir à 0 à la fin de la liste dans le sens horaire")
  void shouldWrapAroundClockwise() {
    addPlayers(2);

    game.updateCurrentPlayerIndex();
    game.updateCurrentPlayerIndex();

    assertThat(game.getCurrentPlayerIndex()).isZero();
  }

  @Test
  @DisplayName("Doit décrémenter l'index dans le sens anti-horaire")
  void shouldUpdateIndexCounterClockwise() {
    addPlayers(3);
    game.updateCurrentPlayerIndex();
    game.reverseDirection();

    game.updateCurrentPlayerIndex();

    assertThat(game.getCurrentPlayerIndex()).isZero();
  }

  @Test
  @DisplayName("Doit passer au dernier index à partir de 0 dans le sens anti-horaire")
  void shouldWrapAroundCounterClockwise() {
    addPlayers(3);
    game.reverseDirection();

    game.updateCurrentPlayerIndex();

    assertThat(game.getCurrentPlayerIndex()).isEqualTo(2);
  }

  @Test
  @DisplayName("Doit ajouter un joueur quand toutes les conditions sont réunies")
  void shouldAddPlayer() {
    Player player = new Player("1", "Toto");
    game.addPlayer(player);
    assertThat(game.getPlayersNumber()).isEqualTo(1);
    assertThat(game.getPlayers()).containsExactly(player);
  }

  @Test
  @DisplayName("Doit rejeter un joueur null")
  void shouldThrowExceptionWhenAddingNullPlayer() {
    assertThatThrownBy(() -> game.addPlayer(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Erreur: aucun joueur à ajouter");
  }

  @Test
  @DisplayName("Doit rejeter un joueur si le statut n'est pas WAITING_FOR_PLAYERS")
  void shouldThrowExceptionWhenGameIsNotWaiting() {
    game.setStatus(GameStatus.IN_PROGRESS);
    assertThatThrownBy(() -> game.addPlayer(new Player("1", "Toto")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Impossible de rejoindre : partie en cours");
  }

  @Test
  @DisplayName("Doit rejeter un joueur si la salle est pleine")
  void shouldThrowExceptionWhenLobbyIsFull() {
    addPlayers(4);

    assertThatThrownBy(() -> game.addPlayer(new Player("5", "Toto")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Impossible de rejoindre : la salle d'attente est pleine");
  }

  @Test
  @DisplayName("Doit retourner le joueur correspondant à l'ID")
  void shouldFindPlayerById() {
    Player player1 = new Player("1", "Toto");
    Player player2 = new Player("2", "Titi");
    game.addPlayer(player1);
    game.addPlayer(player2);

    Player found = game.findPlayerById("2");

    assertThat(found).isEqualTo(player2);
    assertThat(found.getName()).isEqualTo("Titi");
  }

  @Test
  @DisplayName("Doit retourner null si l'ID n'existe pas")
  void shouldReturnNullWhenPlayerNotFound() {
    game.addPlayer(new Player("1", "Toto"));

    Player found = game.findPlayerById("99");

    assertThat(found).isNull();
  }

  @Test
  @DisplayName("Doit retourner null si la liste est vide")
  void shouldReturnNullWhenListIsEmpty() {
    Player found = game.findPlayerById("1");

    assertThat(found).isNull();
  }

  @Test
  @DisplayName("Doit supprimer le joueur si le statut est WAITING_FOR_PLAYERS")
  void shouldRemovePlayerWhenWaitingForPlayers() {
    Player player = new Player("1", "Toto");
    game.addPlayer(player);

    boolean removed = game.removePlayer(player);

    assertThat(removed).isTrue();
    assertThat(game.getPlayersNumber()).isZero();
  }

  @Test
  @DisplayName("Ne doit pas supprimer le joueur si la partie a commencé")
  void shouldNotRemovePlayerWhenGameInProgress() {
    Player player = new Player("1", "Toto");
    game.addPlayer(player);
    game.setStatus(GameStatus.IN_PROGRESS);

    boolean removed = game.removePlayer(player);

    assertThat(removed).isFalse();
    assertThat(game.getPlayersNumber()).isEqualTo(1);
  }

  @Test
  @DisplayName("Doit retourner false si le joueur n'est pas dans la partie")
  void shouldReturnFalseWhenPlayerNotInGame() {
    Player playerInGame = new Player("1", "Toto");
    Player playerNotInGame = new Player("2", "Titi");
    game.addPlayer(playerInGame);

    boolean removed = game.removePlayer(playerNotInGame);

    assertThat(removed).isFalse();
    assertThat(game.getPlayersNumber()).isEqualTo(1);
  }

  @Test
  @DisplayName("Doit retourner null s'il n'y a aucun joueur")
  void shouldReturnNullWhenNoPlayers() {
    assertThat(game.getCurrentPlayer()).isNull();
  }

  @Test
  @DisplayName("Doit retourner le premier joueur par défaut")
  void shouldReturnFirstPlayerByDefault() {
    Player player1 = new Player("1", "Toto");
    game.addPlayer(player1);
    game.addPlayer(new Player("2", "Titi"));

    assertThat(game.getCurrentPlayer()).isEqualTo(player1);
  }

  @Test
  @DisplayName("Doit retourner le bon joueur après mise à jour de l'index")
  void shouldReturnCorrectPlayerAfterIndexUpdate() {
    game.addPlayer(new Player("1", "Toto"));
    Player player2 = new Player("2", "Titi");
    game.addPlayer(player2);

    game.updateCurrentPlayerIndex();

    assertThat(game.getCurrentPlayer()).isEqualTo(player2);
  }

  @Test
  @DisplayName("Doit retourner vrai si la main du joueur actuel est vide")
  void shouldReturnTrueWhenCurrentPlayerHasEmptyHand() {
    Player player = new Player("1", "Toto");
    game.addPlayer(player);

    assertThat(game.isWinner()).isTrue();
  }

  @Test
  @DisplayName("Doit retourner faux si le joueur actuel a des cartes")
  void shouldReturnFalseWhenCurrentPlayerHasCards() {
    Player player = new Player("1", "Toto");
    player.drawCard(new Card(1, Color.RED, Value.FIVE));
    game.addPlayer(player);

    assertThat(game.isWinner()).isFalse();
  }

  @Test
  @DisplayName("Doit retourner 0 quand la liste est vide")
  void shouldReturnZeroWhenNoPlayers() {
    assertThat(game.getPlayersNumber()).isZero();
  }

  @Test
  @DisplayName("getPlayersNumber doit retourner le nombre correct de joueurs")
  void shouldReturnCorrectPlayersNumber() {
    int number = 4;
    addPlayers(number);
    assertThat(game.getPlayersNumber()).isEqualTo(number);
  }
}
