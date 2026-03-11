package fr.upjv.uno.service;

import fr.upjv.uno.model.Card;
import fr.upjv.uno.model.Game;
import fr.upjv.uno.model.Player;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Permet de tester unitairement la classe GameService.
 */

class GameServiceTest {
  private GameService gameService;
  private Game game;
  private Player p1;
  private Player p2;

  @BeforeEach
  void setUp() {
    gameService = new GameService();
    game = gameService.createGame(2, "Standard");
    p1 = new Player("p1", "Alice");
    p2 = new Player("p2", "Bob");
    gameService.joinGame(game.getId(), p1);
    gameService.joinGame(game.getId(), p2);

    game.getDiscardPile().add(new Card(99, Color.RED, Value.ZERO));
  }

  @Test
  @DisplayName("createGame : Doit créer et stocker une nouvelle partie")
  void shouldCreateGameAndStoreIt() {
    assertThat(game).isNotNull();
    assertThat(game.getId()).isNotBlank();
    assertThat(gameService.getGame(game.getId())).isEqualTo(game);
  }

  @Test
  @DisplayName("createGame : Doit générer des identifiants uniques pour chaque partie")
  void shouldCreateGamesWithUniqueIds() {
    Game game1 = gameService.createGame(4, "Standard");
    Game game2 = gameService.createGame(4, "Standard");

    assertThat(game1.getId()).isNotEqualTo(game2.getId());
  }

  @Test
  @DisplayName("getGame : Doit retourner la partie si l'identifiant existe")
  void shouldReturnGameWhenIdExists() {
    Game createdGame = gameService.createGame(4, "Standard");
    Game fetchedGame = gameService.getGame(createdGame.getId());

    assertThat(fetchedGame).isEqualTo(createdGame);
  }

  @Test
  @DisplayName("getGame : Doit lever une exception si l'identifiant est inconnu")
  void shouldThrowExceptionWhenGameNotFound() {
    assertThatThrownBy(() -> gameService.getGame("INVALID_ID"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Partie introuvable");
  }

  @Test
  @DisplayName("getGame : Doit lever une exception si l'identifiant est null")
  void shouldThrowExceptionWhenGameIdIsNull() {
    assertThatThrownBy(() -> gameService.getGame(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("L'identifiant de la partie est invalide");
  }
  @Test
  @DisplayName("getGame : Doit lever une exception si l'identifiant est vide")
  void shouldThrowExceptionWhenGameIdIsBlank() {
    assertThatThrownBy(() -> gameService.getGame("    "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("L'identifiant de la partie est invalide");
  }

  @Test
  @DisplayName("joinGame : Doit ajouter le joueur à une partie existante")
  void shouldAddPlayerToGame() {
    Game game = gameService.createGame(4, "Standard");
    Player player = new Player("1", "toto");

    gameService.joinGame(game.getId(), player);

    assertThat(game.getPlayers()).contains(player);
    assertThat(game.getPlayers()).hasSize(1);
  }

  @Test
  @DisplayName("joinGame : Doit lever une exception si la partie est pleine")
  void shouldThrowExceptionWhenGameIsFull() {
    Player extraPlayer = new Player("3", "tutu");

    assertThatThrownBy(() -> gameService.joinGame(game.getId(), extraPlayer))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("pleine");
  }

  @Test
  @DisplayName("Doit lever une exception quand l'identifiant de la partie est nul lors de la suppression")
  void shouldThrowExceptionWhenGameIdIsNullOnRemove() {
    IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> gameService.removeGame(null));
    assertEquals("L'identifiant de la partie est invalide", exception.getMessage());
  }

  @Test
  @DisplayName("Doit lever une exception quand l'identifiant de la partie est vide lors de la suppression")
  void shouldThrowExceptionWhenGameIdIsBlankOnRemove() {
    IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> gameService.removeGame("   "));
    assertEquals("L'identifiant de la partie est invalide", exception.getMessage());
  }

  @Test
  @DisplayName("Doit supprimer la partie quand l'identifiant correspond à une partie active")
  void shouldRemoveGameWhenGameExists() {
    String gameId = game.getId();

    assertNotNull(gameService.getGame(gameId));

    gameService.removeGame(gameId);

    IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> gameService.getGame(gameId));
    assertEquals("Partie introuvable", exception.getMessage());
  }

  @Test
  @DisplayName("Ne doit rien faire (ne pas crasher) quand l'identifiant valide n'existe pas dans les parties actives")
  void shouldDoNothingWhenGameIsNotFoundOnRemove() {
    assertDoesNotThrow(() -> gameService.removeGame("UNKNOWN_ID"));
  }

  @Test
  @DisplayName("Doit jouer la carte et passer le tour quand une carte standard est jouée")
  void shouldPlayCardSuccessfully() {
    Card validCard = new Card(1, Color.RED, Value.FIVE);
    p1.drawCard(validCard);

    gameService.playCard(game.getId(), "p1", 1, null);

    assertThat(p1.hasThisCard(validCard)).isFalse();
    assertEquals(validCard, game.getTopCard());
    assertEquals(Color.RED, game.getActiveColor());
    assertEquals(p2, game.getCurrentPlayer());
  }

  @Test
  @DisplayName("Doit recycler la défausse quand la pioche est vide pendant une pioche")
  void shouldRecycleDiscardPileWhenDeckIsEmptyDuringDraw() {
    while (!game.isDeckEmpty()) {
      game.getDeck().draw();
    }
    // il y a deja une carte créée dans le setup.
    game.addToDiscardPile(new Card(102, Color.BLUE, Value.ONE));
    game.addToDiscardPile(new Card(103, Color.GREEN, Value.TWO));
    int initialHandSize = p1.getHandSize();
    gameService.drawCards(game.getId(), p1.getId(), 2);

    assertThat(p1.getHandSize()).isEqualTo(initialHandSize + 2);
    assertThat(game.getDiscardPile().getCards().size()).isEqualTo(1);
    assertThat(game.getTopCard().getId()).isEqualTo(103);
    assertThat(game.isDeckEmpty()).isTrue();
  }

  @Test
  @DisplayName("Doit inverser le sens du jeu quand une carte REVERSE est jouée")
  void shouldReverseDirectionWhenReverseCardIsPlayed() {
    Card reverseCard = new Card(1, Color.RED, Value.REVERSE);
    p1.drawCard(reverseCard);

    gameService.playCard(game.getId(), "p1", 1, null);

    assertEquals(-1, game.getDirection());
  }

  @Test
  @DisplayName("Doit passer le tour du joueur suivant quand une carte SKIP est jouée")
  void shouldSkipNextPlayerWhenSkipCardIsPlayed() {
    Card skipCard = new Card(1, Color.RED, Value.SKIP);
    p1.drawCard(skipCard);

    gameService.playCard(game.getId(), "p1", 1, null);

    // 2 joueurs donc encore à p1 de jouer
    assertEquals(p1, game.getCurrentPlayer());
  }

  @Test
  @DisplayName("Doit faire piocher 2 cartes au joueur suivant et passer son tour quand un +2 est joué")
  void shouldForceNextPlayerToDrawTwoAndSkipWhenDrawTwoIsPlayed() {
    Card drawTwoCard = new Card(1, Color.RED, Value.DRAW_TWO);
    p1.drawCard(drawTwoCard);

    int p2InitialHandSize = p2.getHandSize();
    gameService.playCard(game.getId(), "p1", 1, null);

    assertEquals(p2InitialHandSize + 2, p2.getHandSize());
    assertEquals(p1, game.getCurrentPlayer());
  }

  @Test
  @DisplayName("Doit changer la couleur active et passer le tour quand un Joker est joué")
  void shouldChangeActiveColorAndNextTurnWhenWildCardIsPlayed() {
    Card wildCard = new Card(1, Color.BLACK, Value.WILD);
    p1.drawCard(wildCard);

    gameService.playCard(game.getId(), "p1", 1, Color.BLUE);

    assertEquals(Color.BLUE, game.getActiveColor());
    assertEquals(p2, game.getCurrentPlayer());
  }

  @Test
  @DisplayName("Doit changer la couleur, faire piocher 4 cartes au joueur suivant et passer son tour quand un +4 est joué")
  void blablablaPlus4() {
    Card wildDrawFour = new Card(1, Color.BLACK, Value.WILD_DRAW_FOUR);
    p1.drawCard(wildDrawFour);

    int p2InitialHandSize = p2.getHandSize();
    gameService.playCard(game.getId(), "p1", 1, Color.GREEN);

    assertEquals(Color.GREEN, game.getActiveColor());
    assertEquals(p2InitialHandSize + 4, p2.getHandSize());
    assertEquals(p1, game.getCurrentPlayer());
  }


  @Test
  @DisplayName("Doit lever une exception quand la partie n'existe pas")
  void shouldThrowExceptionWhenGameIsNotFound() {
    assertThrows(IllegalArgumentException.class,
            () -> gameService.playCard("wrongId", "p1", 1, null));
  }

  @Test
  @DisplayName("Doit lever une exception quand le joueur n'est pas dans la partie")
  void shouldThrowExceptionWhenPlayerIsNotInGame() {
    assertThrows(IllegalArgumentException.class,
            () -> gameService.playCard(game.getId(), "wrongPlayer", 1, null));
  }

  @Test
  @DisplayName("Doit lever une exception quand ce n'est pas le tour du joueur")
  void shouldThrowExceptionWhenItIsNotPlayerTurn() {
    assertThrows(IllegalArgumentException.class,
            () -> gameService.playCard(game.getId(), "p2", 1, null));
  }

  @Test
  @DisplayName("Doit lever une exception quand la carte n'est pas dans la main du joueur")
  void shouldThrowExceptionWhenCardIsNotInPlayerHand() {
    assertThrows(IllegalArgumentException.class,
            () -> gameService.playCard(game.getId(), "p1", 999, null));
  }

  @Test
  @DisplayName("Doit lever une exception quand une carte noire est jouée sans couleur choisie")
  void shouldThrowExceptionWhenBlackCardIsPlayedWithoutColor() {
    Card wildCard = new Card(1, Color.BLACK, Value.WILD);
    p1.drawCard(wildCard);

    assertThrows(IllegalArgumentException.class,
            () -> gameService.playCard(game.getId(), "p1", 1, null));
  }

  @Test
  @DisplayName("Doit lever une exception quand la carte n'est pas jouable")
  void shouldThrowExceptionWhenCardIsUnplayable() {
    Card badCard = new Card(1, Color.BLUE, Value.ONE);
    p1.drawCard(badCard);

    assertThrows(IllegalArgumentException.class,
            () -> gameService.playCard(game.getId(), "p1", 1, null));
  }

}