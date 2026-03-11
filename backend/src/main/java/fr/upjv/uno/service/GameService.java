package fr.upjv.uno.service;

import fr.upjv.uno.factory.DeckFactory;
import fr.upjv.uno.model.*;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.util.GameCodeGenerator;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gère la logique des parties.
 */
@Component
public class GameService {
  private final Map<String, Game> activeGames;

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
    game.addPlayer(player);
    return game;
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

    Player player = game.findPlayerById(playerId);
    if (player == null)
      throw new IllegalArgumentException("Joueur introuvable");
    if (!player.equals(game.getCurrentPlayer()))
      throw new IllegalArgumentException("Ce n'est pas son tour");

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
      case REVERSE -> game.reverseDirection();
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

    game.updateCurrentPlayerIndex();
  }
  // TODO: startGame, callUno, leaveGame, handleWin, addBot, calculateScores
}
