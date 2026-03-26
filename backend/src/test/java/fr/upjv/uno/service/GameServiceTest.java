package fr.upjv.uno.service;

import fr.upjv.uno.model.AIPlayer;
import fr.upjv.uno.model.Card;
import fr.upjv.uno.model.Game;
import fr.upjv.uno.model.Player;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.GameStatus;
import fr.upjv.uno.model.enums.Value;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;

import java.util.concurrent.atomic.AtomicBoolean;

import fr.upjv.uno.model.enums.Difficulty;

/**
 * Permet de tester unitairement la classe GameService.
 */

class GameServiceTest {
  private GameService gameService;
  private Game game;
  private Player p1;
  private Player p2;
  private AtomicInteger broadcastCallCount;

  @BeforeEach
  void setUp() {
    gameService = new GameService();
    game = gameService.createGame(2, "Standard");
    p1 = new Player("p1", "Alice");
    p2 = new Player("p2", "Bob");
    gameService.joinGame(game.getId(), p1);
    gameService.joinGame(game.getId(), p2);
    game.setStatus(GameStatus.IN_PROGRESS);

    game.getDiscardPile().add(new Card(99, Color.RED, Value.ZERO));
    broadcastCallCount = new AtomicInteger(0);
    gameService.setBroadcastCallback(g -> broadcastCallCount.incrementAndGet());
    p1.setConnected(true);
    p2.setConnected(true);
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
            .hasMessageContaining("partie en cours");
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

  @Test
  @DisplayName("connectPlayer : Doit lier la session, le joueur, et le marquer connecté")
  void shouldMapSessionAndSetPlayerConnected() {
    p1.setConnected(false);

    gameService.connectPlayer("session-123", game.getId(), p1.getId());

    assertThat(p1.isConnected()).isTrue();
  }

  @Test
  @DisplayName("connectPlayer : Doit lever une exception si la partie n'existe pas")
  void shouldThrowExceptionOnConnectWhenGameNotFound() {
    assertThatThrownBy(() -> gameService.connectPlayer("session-123", "wrongId", p1.getId()))
            .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("disconnectPlayer : Doit marquer le joueur déconnecté et appeler le broadcast")
  void shouldSetPlayerDisconnectedAndBroadcast() {
    gameService.connectPlayer("session-123", game.getId(), p1.getId());

    game.updateCurrentPlayerIndex();

    gameService.disconnectPlayer("session-123");

    assertThat(p1.isConnected()).isFalse();
    assertThat(broadcastCallCount.get()).isEqualTo(1);
  }

  @Test
  @DisplayName("disconnectPlayer : Doit déclencher le tour du bot si c'était le tour du joueur déconnecté")
  void shouldTriggerBotTurnWhenCurrentPlayerDisconnects() {
    gameService.connectPlayer("session-123", game.getId(), p1.getId());
    assertThat(game.getCurrentPlayer()).isEqualTo(p1);

    gameService.disconnectPlayer("session-123");

    assertThat(p1.isConnected()).isFalse();
    assertThat(broadcastCallCount.get()).isGreaterThanOrEqualTo(1);
  }

  @Test
  @DisplayName("disconnectPlayer : Ne doit rien faire si la session est inconnue")
  void shouldDoNothingOnDisconnectWhenSessionIsUnknown() {
    gameService.disconnectPlayer("unknown-session");

    assertThat(p1.isConnected()).isTrue();
    assertThat(p2.isConnected()).isTrue();
    assertThat(broadcastCallCount.get()).isEqualTo(0);
  }

  @Test
  @DisplayName("disconnectPlayer : Ne doit pas crasher si la partie a été supprimée entre temps")
  void shouldNotCrashOnDisconnectIfGameWasRemoved() {
    gameService.connectPlayer("session-123", game.getId(), p1.getId());
    gameService.removeGame(game.getId());

    assertDoesNotThrow(() -> gameService.disconnectPlayer("session-123"));
  }

  @Test
  @DisplayName("reconnectPlayer : Doit marquer le joueur connecté et appeler le broadcast")
  void shouldSetPlayerConnectedAndBroadcastOnReconnect() {
    p1.setConnected(false);

    gameService.reconnectPlayer(game.getId(), p1.getId());

    assertThat(p1.isConnected()).isTrue();
    assertThat(broadcastCallCount.get()).isEqualTo(1);
  }

  @Test
  @DisplayName("reconnectPlayer : Ne doit pas appeler le broadcast si le joueur était déjà connecté")
  void shouldNotBroadcastOnReconnectIfAlreadyConnected() {
    p1.setConnected(true);

    gameService.reconnectPlayer(game.getId(), p1.getId());

    assertThat(p1.isConnected()).isTrue();
    assertThat(broadcastCallCount.get()).isEqualTo(0);
  }

  @Test
  @DisplayName("reconnectPlayer : Doit lever une exception si le joueur est introuvable")
  void shouldThrowExceptionOnReconnectWhenPlayerNotFound() {
    assertThatThrownBy(() -> gameService.reconnectPlayer(game.getId(), "ghost-id"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Joueur introuvable");
  }

  @Test
  @DisplayName("reconnectPlayer : Doit lever une exception si la partie n'existe pas")
  void shouldThrowExceptionOnReconnectWhenGameNotFound() {
    assertThatThrownBy(() -> gameService.reconnectPlayer("wrong-game", p1.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Partie introuvable");
  }

  @Test
  @DisplayName("addBot : Doit ajouter un bot à la partie")
  void shouldAddBotToGame() {
    game.removePlayer(p2);
    int initialSize = game.getPlayersNumber();
    game.setStatus(GameStatus.WAITING_FOR_PLAYERS);


    gameService.addBot(game.getId(), Difficulty.RANDOM);

    assertThat(game.getPlayersNumber()).isEqualTo(initialSize + 1);
    assertThat(game.getPlayers().get(initialSize)).isInstanceOf(AIPlayer.class);
  }

  @Test
  @DisplayName("addBot : Doit lever une exception si la partie n'existe pas")
  void shouldThrowExceptionOnAddBotWhenGameNotFound() {
    assertThatThrownBy(() -> gameService.addBot("wrong-id", Difficulty.RANDOM))
            .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("checkPlayerTurn : Doit lever une exception si ce n'est pas le tour du joueur")
  void shouldThrowExceptionWhenNotPlayerTurn() {
    assertThatThrownBy(() -> gameService.chooseToDraw(game.getId(), p2.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Ce n'est pas le tour de ce joueur");
  }

  @Test
  @DisplayName("checkPlayerTurn : Ne doit pas lever d'exception si c'est le bon tour")
  void shouldNotThrowExceptionWhenItIsPlayerTurn() {
    assertDoesNotThrow(() -> gameService.chooseToDraw(game.getId(), p1.getId()));
  }

  @Test
  @DisplayName("playBotTurn : Ne fait rien si le joueur courant est humain et connecté")
  void shouldDoNothingIfCurrentPlayerIsHumanAndConnected() {
    p1.setConnected(true);
    gameService.playBotTurn(game.getId());

    assertThat(game.getCurrentPlayer()).isEqualTo(p1);
  }

  @Test
  @DisplayName("playBotTurn : Fait piocher l'humain déconnecté après un délai")
  void shouldForceDrawIfHumanIsDisconnected() throws InterruptedException {
    p1.setConnected(false);
    int initialHandSize = p1.getHandSize();

    gameService.playBotTurn(game.getId());
    Thread.sleep(1200); // 1000ms de délai + marge réseau/thread

    assertThat(p1.getHandSize()).isEqualTo(initialHandSize + 1);
    assertThat(game.getCurrentPlayer()).isEqualTo(p2);
    assertThat(broadcastCallCount.get()).isGreaterThanOrEqualTo(1);
  }

  @Test
  @DisplayName("playBotTurn : Fait jouer le bot après un délai")
  void shouldMakeBotPlayAfterDelay() throws InterruptedException {
    gameService.addBot(game.getId(), Difficulty.RANDOM);
    game.updateCurrentPlayerIndex(); // Tour à p2
    game.updateCurrentPlayerIndex(); // Tour au bot

    Player bot = game.getCurrentPlayer();

    gameService.playBotTurn(game.getId());
    Thread.sleep(2000);

    assertThat(game.getCurrentPlayer()).isNotEqualTo(bot);
    assertThat(broadcastCallCount.get()).isGreaterThanOrEqualTo(1);
  }

  @Test
  @DisplayName("chooseToDraw : Doit faire piocher exactement une carte et passer le tour")
  void shouldDrawOneCardAndPassTurn() {
    int initialHandSize = p1.getHandSize();

    gameService.chooseToDraw(game.getId(), p1.getId());

    assertThat(p1.getHandSize()).isEqualTo(initialHandSize + 1);
    assertThat(game.getCurrentPlayer()).isEqualTo(p2);
  }

  @Test
  @DisplayName("callUno : Doit marquer le joueur en statut UNO s'il a 1 carte ou moins")
  void shouldSetUnoStatusIfOneCardOrLess() {
    gameService.callUno(game.getId(), p1.getId());

    assertThat(p1.isUnoCalled()).isTrue();
  }

  @Test
  @DisplayName("callUno : Ne doit pas marquer le joueur en statut UNO s'il a plus d'1 carte")
  void shouldNotSetUnoStatusIfMoreThanOneCard() {
    gameService.drawCards(game.getId(), p1.getId(), 2);

    gameService.callUno(game.getId(), p1.getId());

    assertThat(p1.isUnoCalled()).isFalse();
  }

  @Test
  @DisplayName("callUno (Contre-Uno) : Doit faire piocher 2 cartes à un adversaire qui a 1 carte et n'a pas dit UNO")
  void shouldPenalizeOtherPlayerWhoForgotUno() {
    gameService.drawCards(game.getId(), p2.getId(), 1);
    p2.setUnoCalled(false);
    int p2InitialHandSize = p2.getHandSize();

    gameService.callUno(game.getId(), p1.getId());

    assertThat(p2.getHandSize()).isEqualTo(p2InitialHandSize + 2);
  }

  @Test
  @DisplayName("callUno (Contre-Uno) : Ne doit pas pénaliser un adversaire qui a bien dit UNO avec 1 carte")
  void shouldNotPenalizeOtherPlayerWhoSaidUno() {
    gameService.drawCards(game.getId(), p2.getId(), 1);
    p2.setUnoCalled(true);
    int p2InitialHandSize = p2.getHandSize();

    gameService.callUno(game.getId(), p1.getId());

    assertThat(p2.getHandSize()).isEqualTo(p2InitialHandSize);
  }

  @Test
  @DisplayName("callUno : Doit lever une exception si la partie n'est pas en cours")
  void shouldThrowExceptionOnCallUnoWhenGameNotInProgress() {
    game.setStatus(fr.upjv.uno.model.enums.GameStatus.FINISHED);

    assertThatThrownBy(() -> gameService.callUno(game.getId(), p1.getId()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("La partie n'est pas en cours");
  }

  @Test
  @DisplayName("callUno : Doit lever une exception si le joueur est introuvable")
  void shouldThrowExceptionOnCallUnoWhenPlayerNotFound() {
    assertThatThrownBy(() -> gameService.callUno(game.getId(), "wrong-id"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Joueur introuvable");
  }

  @Test
  @DisplayName("leaveGame : Doit retirer le joueur de la partie")
  void shouldRemovePlayerFromGame() {
    gameService.leaveGame(game.getId(), p1.getId());

    assertThat(game.getPlayers()).doesNotContain(p1);
    assertThat(game.getPlayers()).containsOnly(p2);
  }

  @Test
  @DisplayName("leaveGame : Doit supprimer la partie si elle se retrouve vide")
  void shouldRemoveGameWhenEmpty() {
    gameService.leaveGame(game.getId(), p1.getId());
    gameService.leaveGame(game.getId(), p2.getId());

    assertThatThrownBy(() -> gameService.getGame(game.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Partie introuvable");
  }

  @Test
  @DisplayName("startGame : Doit distribuer 7 cartes, poser la première carte et passer en statut IN_PROGRESS")
  void shouldStartGameCorrectly() {
    game.setStatus(GameStatus.WAITING_FOR_PLAYERS);

    gameService.startGame(game.getId());

    assertThat(p1.getHandSize()).isEqualTo(7);
    assertThat(p2.getHandSize()).isEqualTo(7);
    assertThat(game.getDiscardPile().getCards()).isNotEmpty();
    assertThat(game.getActiveColor()).isNotNull();
    assertThat(game.getStatus()).isEqualTo(GameStatus.IN_PROGRESS);
  }

  @Test
  @DisplayName("startGame : Doit combler les places manquantes avec des bots")
  void shouldFillWithBotsWhenStarting() {
    Game game4Players = gameService.createGame(4, "Standard");
    gameService.joinGame(game4Players.getId(), p1);

    gameService.startGame(game4Players.getId());

    assertThat(game4Players.getPlayersNumber()).isEqualTo(4);
    long botCount = game4Players.getPlayers().stream()
            .filter(p -> p instanceof AIPlayer)
            .count();
    assertThat(botCount).isEqualTo(3);
  }

  @Test
  @DisplayName("restartGame : Doit vider les mains, réinitialiser la pioche et relancer une manche")
  void shouldRestartGame() {
    gameService.startGame(game.getId());

    p1.clearHand();
    p2.clearHand();
    int currentDeckSize = game.getDeck().getSize();

    gameService.restartGame(game.getId());

    assertThat(p1.getHandSize()).isEqualTo(7);
    assertThat(p2.getHandSize()).isEqualTo(7);
    assertThat(game.getDeck().getSize()).isGreaterThan(currentDeckSize);
    assertThat(game.getStatus()).isEqualTo(GameStatus.IN_PROGRESS);
  }

}