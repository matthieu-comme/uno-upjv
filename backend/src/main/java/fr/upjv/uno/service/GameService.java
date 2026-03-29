package fr.upjv.uno.service;

import fr.upjv.uno.factory.DeckFactory;
import fr.upjv.uno.model.*;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Difficulty;
import fr.upjv.uno.model.enums.GameStatus;
import fr.upjv.uno.util.GameCodeGenerator;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Gère la logique des parties.
 */
@Component
public class GameService {
  private final Map<String, Game> activeGames;
  // sessionId -> [gameId, playerId]
  private final Map<String, String[]> sessionPlayerMap = new ConcurrentHashMap<>();

  @Setter
  private Consumer<Game> broadcastCallback;
  private final DeckFactory deckFactory;

  /**
   * Constructeur par défaut.
   */
  public GameService() {
    deckFactory = new DeckFactory();
    activeGames = new ConcurrentHashMap<>();
  }

  /**
   *
   * @param maxPlayers nombre de joueurs maximum dans la partie.
   * @param gameMode   mode de jeu choisi (ex : Standard, Rapide, etc.)
   * @return Game
   */
  public Game createGame(int maxPlayers, String gameMode) {
    String gameId = generateUniqueGameCode();
    Deck deck = deckFactory.createStandardDeck();
    Game newGame = new Game(gameId, deck, new DiscardPile(), maxPlayers);
    activeGames.put(gameId, newGame);
    return newGame;
  }

  /**
   * Cherche une Game via son id.
   *
   * @param gameId identifiant de la partie à trouver.
   * @return {@code Optional} contenant Game si trouvé, {@code empty} sinon.
   */
  public Game getGame(String gameId) {
    if (gameId == null || gameId.isBlank())
      throw new IllegalArgumentException("L'identifiant de la partie est invalide");
    Game game = activeGames.get(gameId);
    if (game == null) {
      throw new IllegalArgumentException("Partie introuvable");
    }
    return game;
  }

  /**
   * Supprime une partie.
   *
   * @param gameId Identifiant de la partie à supprimer.
   */
  public void removeGame(String gameId) {
    if (gameId == null || gameId.isBlank())
      throw new IllegalArgumentException("L'identifiant de la partie est invalide");

    activeGames.remove(gameId);
  }

  /**
   *
   * @param gameId id de la partie à rejoindre
   * @param player Player qui veut rejoindre.
   * @return la partie
   */
  public Game joinGame(String gameId, Player player) {
    Game game = getGame(gameId);

    if (!isNameAvailable(game, player.getName()))
      throw new IllegalArgumentException("Le nom " + player.getName() + " n'est pas disponible");

    game.addPlayer(player);
    return game;

  }

  /**
   * Vérifie si le nom saisi par le joueur est disponible.
   *
   * @param name Nom à verifier
   * @return {@code true} si le nom est disponible, {@code false} sinon.
   */
  private boolean isNameAvailable(Game game, String name) {
    for (Player p : game.getPlayers()) {
      if (p.getName().equals(name))
        return false;
    }
    return true;
  }

  /**
   * Fait quitter un joueur de la partie. Si la partie devient vide, elle est supprimée.
   *
   * @param gameId   Identifiant de la partie.
   * @param playerId Identifiant du joueur qui quitte.
   */
  public void leaveGame(String gameId, String playerId) {
    Game game = getGame(gameId);
    Player player = game.findPlayerById(playerId);

    if (player == null) return;

    if (game.getStatus() == GameStatus.IN_PROGRESS) {
      // Remplace le joueur par un bot qui hérite de sa main et de sa position
      String botId = java.util.UUID.randomUUID().toString();
      AIPlayer bot = new AIPlayer(botId, player.getName() + " (bot)", Difficulty.RANDOM);
      game.replacePlayerWithBot(player, bot);
      // Si c'était son tour, le bot joue immédiatement
      if (game.getCurrentPlayer().getId().equals(botId)) {
        playBotTurn(gameId);
      }
    } else {
      game.removePlayer(player);
      if (game.getPlayers().isEmpty()) {
        removeGame(gameId);
      }
    }
  }

  /**
   * Démarre la partie, distribue sept cartes à chaque joueur et initialise la carte de départ sur la défausse.
   * Comble avec des bots si nécessaire.
   *
   * @param gameId Identifiant de la partie.
   */
  public void startGame(String gameId) {
    Game game = getGame(gameId);

    // comble avec des bots
    while (game.getPlayersNumber() < game.getMaxPlayers()) {
      addBot(gameId, Difficulty.RANDOM);
    }
    game.getDeck().shuffle();

    for (Player player : game.getPlayers()) {
      drawCards(gameId, player.getId(), 7);
    }

    Card firstCard = game.getDeck().draw();
    game.addToDiscardPile(firstCard);
    Color firstColor = firstCard.getColor();

    // je décide que ce sera rouge si la première carte est noire
    if (firstColor == Color.BLACK) {
      firstColor = Color.RED;
    }
    game.setActiveColor(firstColor);

    game.setStatus(GameStatus.IN_PROGRESS);
    playBotTurn(gameId);
  }

  /**
   * Réinitialise la partie avec les joueurs actuels pour une nouvelle manche.
   *
   * @param gameId Identifiant de la partie.
   */
  public void restartGame(String gameId) {
    Game game = getGame(gameId);

    for (Player player : game.getPlayers()) {
      player.clearHand();
    }
    game.resetForNewRound(deckFactory.createStandardDeck());

    startGame(gameId);
  }

  /**
   * Génère un nouveau GameCode tant qu'il existe déjà une partie avec cet id.
   * <p>Un code est composé de HUIT caractères. Chaque char peut prendre 36 valeurs (A-Z0-9).
   * Il existe donc 36^8 soit 2821 milliards de codes uniques.</p>
   *
   * @return code AN de 8 caractères.
   */
  public String generateUniqueGameCode() {
    String code;
    do {
      code = GameCodeGenerator.generateCode();
    } while (activeGames.containsKey(code));
    return code;
  }


  /**
   * Pioche {@code count} fois et ajoute ces cartes dans la main du joueur.
   * Si la pioche est vide, elle est remplie à partir de la défausse.
   *
   * @param gameId   id de la partie
   * @param playerId id du joueur qui pioche
   * @param count    nombre de cartes à piocher
   */
  public void drawCards(String gameId, String playerId, int count) {
    Game game = activeGames.get(gameId);
    Player player = game.findPlayerById(playerId);

    for (int i = 0; i < count; i++) {
      if (game.isDeckEmpty())
        game.recycleDiscardPileIntoDeck();
      Card drawnCard = game.getDeck().draw();
      player.drawCard(drawnCard);
    }
  }

  /**
   *
   * @param gameId      id de la partie.
   * @param playerId    id du joueur.
   * @param cardId      id de la carte jouée.
   * @param chosenColor Couleur choisie en cas de joker.
   */
  public void playCard(String gameId, String playerId, int cardId, Color chosenColor) {
    Game game = getGame(gameId);
    if (game.getStatus() != GameStatus.IN_PROGRESS)
      throw new IllegalArgumentException("La partie n'est pas en cours");

    checkPlayerTurn(game, playerId);

    Player player = game.findPlayerById(playerId);
    if (player == null)
      throw new IllegalArgumentException("Joueur introuvable");

    Card card = player.getCards().stream().filter(c -> c.getId() == cardId).
            findFirst().orElseThrow(() -> new IllegalArgumentException("Carte introuvable"));

    if (card.getColor() == Color.BLACK && chosenColor == null)
      throw new IllegalArgumentException("Aucune couleur choisie avec le joker");

    Card topCard = game.getTopCard();
    Color currentActiveColor = game.getActiveColor() != null ? game.getActiveColor() : topCard.getColor();

    if (!card.isPlayable(currentActiveColor, topCard.getValue()))
      throw new IllegalArgumentException("Cette carte ne peut pas être jouée");

    player.playCard(card);
    game.setActiveColor(card.getColor());
    game.addToDiscardPile(card);

    if (card.getColor() == Color.BLACK) {
      game.setActiveColor(chosenColor);
    } else {
      game.setActiveColor(card.getColor());
    }

    switch (card.getValue()) {
      case REVERSE -> {
        if (game.getMaxPlayers() == 2) // rustine pour les games à 2 joueurs
          game.updateCurrentPlayerIndex();
        game.reverseDirection();
      }
      case SKIP -> game.updateCurrentPlayerIndex();
      case DRAW_TWO -> {
        game.updateCurrentPlayerIndex();
        drawCards(gameId, game.getCurrentPlayer().getId(), 2);
      }
      case WILD_DRAW_FOUR -> {
        game.updateCurrentPlayerIndex();
        drawCards(gameId, game.getCurrentPlayer().getId(), 4);
      }
      default -> {
      }
    }
    if (player.hasEmptyHand()) {
      handleWin(game, player);
      return;
    }
    game.updateCurrentPlayerIndex();

    playBotTurn(gameId);
  }

  /**
   * Clôture la partie, calcule les scores et désigne le vainqueur.
   *
   * @param game   La partie en cours.
   * @param winner Le joueur qui a vidé sa main.
   */
  private void handleWin(Game game, Player winner) {
    game.setStatus(GameStatus.FINISHED);

    int pointsWon = calculateScores(game);
    winner.addScore(pointsWon);
  }

  /**
   * Additionne les points de toutes les cartes restantes dans les mains des adversaires.
   *
   * @param game La partie terminée.
   * @return Le score total remporté par le vainqueur.
   */
  private int calculateScores(Game game) {
    int total = 0;
    for (Player p : game.getPlayers()) {
      for (Card card : p.getCards()) {
        total += card.getPoints();
        card.getPoints();
      }
    }
    return total;
  }

  /**
   * Gère le vote pour une revanche.
   * Après le premier vote, un timer de 30 sec s'enclenche.
   * Si tous les joueurs votent dans le temps imparti, une partie recommence.
   * Sinon, elle est effacée.
   *
   * @param gameId   Identifiant de la partie.
   * @param playerId Identifiant du joueur qui vote.
   */
  public void voteRematch(String gameId, String playerId) {
    Game game = getGame(gameId);

    if (game.getStatus() != GameStatus.FINISHED) {
      throw new IllegalStateException("Impossible de voter, la partie n'est pas terminée.");
    }

    boolean isFirstVote = game.getRematchVoteCount() == 0;
    game.addRematchVoter(playerId);

    int humanCount = game.getHumanPlayerCount();

    if (game.getRematchVoteCount() >= humanCount) {
      game.clearRematchVoters();
      restartGame(gameId);
      return;
    }

    if (isFirstVote) {
      CompletableFuture.delayedExecutor(30, TimeUnit.SECONDS).execute(() -> {
        try {
          Game g = getGame(gameId);

          if (g.getStatus() == GameStatus.FINISHED && g.getRematchVoteCount() > 0) {
            g.setRematchExpired(true);

            if (broadcastCallback != null) {
              broadcastCallback.accept(g);
            }

            CompletableFuture.delayedExecutor(10, TimeUnit.SECONDS).execute(() -> {
              removeGame(gameId);
            });
          }
        } catch (IllegalArgumentException ignored) {
          // La partie n'existe déjà plus
        }
      });
    }
  }

  /**
   * Fait piocher une carte au joueur dont c'est le tour et passe au joueur suivant.
   *
   * @param gameId   Identifiant de la partie.
   * @param playerId Identifiant du joueur qui choisit de piocher.
   */
  public void chooseToDraw(String gameId, String playerId) {
    Game game = getGame(gameId);

    checkPlayerTurn(game, playerId);

    drawCards(gameId, playerId, 1);
    game.updateCurrentPlayerIndex();

    playBotTurn(gameId);
  }

  /**
   * Gère l'annonce "Uno" et le "Contre-Uno".
   *
   * @param gameId   Identifiant de la partie.
   * @param callerId Identifiant du joueur qui clique sur le bouton "Uno".
   */
  public void callUno(String gameId, String callerId) {
    Game game = getGame(gameId);

    if (game.getStatus() != GameStatus.IN_PROGRESS)
      throw new IllegalStateException("La partie n'est pas en cours");

    Player caller = game.findPlayerById(callerId);
    if (caller == null)
      throw new IllegalArgumentException("Joueur introuvable");

    // uno
    if (caller.getHandSize() <= 1) {
      caller.setUnoCalled(true);
    }

    // contre-uno
    for (Player p : game.getPlayers()) {
      if (!p.getId().equals(callerId) && p.getHandSize() == 1 && !p.isUnoCalled()) {
        drawCards(gameId, p.getId(), 2); // Pénalité de 2 cartes
      }
    }
  }


  /**
   * Vérifie si c'est bien le tour du joueur spécifié.
   *
   * @param game     La partie en cours.
   * @param playerId L'identifiant du joueur à vérifier.
   * @throws IllegalArgumentException Si ce n'est pas le tour du joueur.
   */
  private void checkPlayerTurn(Game game, String playerId) {
    if (game.getCurrentPlayer() == null || !game.getCurrentPlayer().getId().equals(playerId)) {
      throw new IllegalArgumentException("Ce n'est pas le tour de ce joueur");
    }
  }


  /**
   * Ajoute un joueur contrôlé par l'ordinateur à la partie.
   *
   * @param gameId     Identifiant de la partie.
   * @param difficulty Difficulté du bot.
   */
  public void addBot(String gameId, Difficulty difficulty) {
    Game game = getGame(gameId);
    String botId = java.util.UUID.randomUUID().toString();
    AIPlayer bot = new AIPlayer(botId, botId.substring(0, 4), difficulty);
    game.addPlayer(bot);
  }

  /**
   * Fait jouer le bot si c'est son tour.
   *
   * @param gameId Identifiant de la partie.
   */
  public void playBotTurn(String gameId) {
    Game game = getGame(gameId);
    Player currentPlayer = game.getCurrentPlayer();

    if (currentPlayer == null) return;

    if (!currentPlayer.isConnected() && !(currentPlayer instanceof AIPlayer)) {
      CompletableFuture.delayedExecutor(1000, TimeUnit.MILLISECONDS).execute(() -> {
        try {
          chooseToDraw(gameId, currentPlayer.getId());
          if (broadcastCallback != null) broadcastCallback.accept(getGame(gameId));
        } catch (Exception e) {
          System.err.println("Tour auto joueur déconnecté : " + e.getMessage());
        }
      });
      return;
    }

    if (!(currentPlayer instanceof AIPlayer bot)) {
      return;
    }

    // simule temps de reflexion
    CompletableFuture.delayedExecutor(1500, TimeUnit.MILLISECONDS).execute(() -> {
      try {
        Card topCard = game.getTopCard();
        Color activeColor = game.getActiveColor() != null ? game.getActiveColor() : topCard.getColor();

        Card cardToPlay = bot.chooseCardToPlay(activeColor, topCard.getValue());

        if (cardToPlay != null) {
          Color chosenColor = null;
          if (cardToPlay.getColor() == Color.BLACK) {
            chosenColor = bot.chooseColor();
          }
          playCard(gameId, bot.getId(), cardToPlay.getId(), chosenColor);
        } else { // aucune carte jouable
          chooseToDraw(gameId, bot.getId());
        }
        if (broadcastCallback != null) {
          broadcastCallback.accept(getGame(gameId));
        }
      } catch (Exception e) {
        System.err.println("Erreur lors du tour du bot : " + e.getMessage());
      }
    });
  }

  /**
   * Associe une session WebSocket à un joueur et le marque comme connecté.
   *
   * @param sessionId Identifiant de la session WebSocket
   * @param gameId    Identifiant de la partie en cours.
   * @param playerId  Identifiant du joueur connecté.
   */
  public void connectPlayer(String sessionId, String gameId, String playerId) {
    sessionPlayerMap.put(sessionId, new String[]{gameId, playerId});
    Game game = getGame(gameId);
    Player p = game.findPlayerById(playerId);
    if (p != null) {
      p.setConnected(true);
    }
  }

  /**
   * Supprime la session WebSocket et marque le joueur comme déconnecté.
   *
   * @param sessionId Identifiant de la session WebSocket
   */
  public void disconnectPlayer(String sessionId) {
    String[] info = sessionPlayerMap.remove(sessionId);
    if (info != null) {
      String gameId = info[0];
      String playerId = info[1];
      try {
        Game game = getGame(gameId);
        Player p = game.findPlayerById(playerId);
        if (p != null) {
          p.setConnected(false);
          broadcastCallback.accept(game);
          // on déclenche le bot, si c'est son tour
          if (game.getCurrentPlayer().getId().equals(playerId)) {
            playBotTurn(gameId);
          }
        }
      } catch (IllegalArgumentException ignored) {
      }
    }
  }

  /**
   * Cherche le joueur qui tente de se reconnecter et notifie les autres.
   *
   * @param gameId   Identifiant de la partie en cours.
   * @param playerId Identifiant du joueur qui se reconnecte.
   */
  public void reconnectPlayer(String gameId, String playerId) {
    Game game = getGame(gameId);
    Player player = game.getPlayers().stream()
            .filter(p -> p.getId().equals(playerId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Joueur introuvable"));

    if (!player.isConnected()) {
      player.setConnected(true);

      if (broadcastCallback != null) {
        broadcastCallback.accept(game);
      }
    }
  }

}
