package fr.upjv.uno.service;

import fr.upjv.uno.factory.DeckFactory;
import fr.upjv.uno.model.*;
import fr.upjv.uno.util.GameCodeGenerator;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Gère la logique des parties.
 */
@Component
public class GameService {
  private final List<Game> games;

  private final DeckFactory deckFactory;

  /**
   * Constructeur par défaut.
   */
  public GameService() {
    deckFactory = new DeckFactory();
    games = new ArrayList<>();
  }

  /**
   * Cherche une Game via son id.
   *
   * @param id identifiant de la partie à trouver.
   * @return {@code Optional} contenant Game si trouvé, {@code empty} sinon.
   */
  public Optional<Game> findGameById(String id) {
    for (Game game : games) {
      if (game.getId().equals(id))
        return Optional.of(game);
    }
    return Optional.empty();
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

    } while (findGameById(code).isPresent());
    return code;
  }

  /**
   *
   * @param maxPlayers nombre de joueurs maximum dans la partie.
   * @param gameMode   mode de jeu choisi (ex : Standard, Rapide, etc.)
   * @return Game
   */
  public Game createGame(int maxPlayers, String gameMode) {
    String code = generateUniqueGameCode();
    Deck deck = deckFactory.createStandardDeck();

    return new Game(code, deck, new DiscardPile(), maxPlayers);
  }

  /**
   *
   * @param gameId id de la partie à rejoindre
   * @param player Player qui veut rejoindre.
   * @return la partie
   */
  public Game joinGame(String gameId, Player player) {
    Game game = findGameById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Partie introuvable"));

    game.addPlayer(player);

    return game;
  }

  /**
   * Pioche {@code count} fois et ajoute ces cartes dans la main du joueur.
   * Si la pioche est vide, elle est remplie à partir de la défausse.
   * @param game instance de la partie
   * @param player joueur qui pioche
   * @param count nombre de cartes à piocher
   */
  public void drawCards(Game game, Player player, int count) {
    for (int i = 0; i < count; i++) {
      if (game.isDeckEmpty())
        game.recycleDiscardPileIntoDeck();
      Card drawnCard = game.getDeck().draw();
      player.drawCard(drawnCard);
    }
  }

  // TODO: gérer la couleur choisie après un joker.
  public void playCard(String gameId, String playerId, int cardId) {
    Game game = findGameById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Partie introuvable"));

    Player player = game.findPlayerById(playerId);
    if (player == null)
      throw new IllegalArgumentException("Joueur introuvable");

    Card card = player.getCards().stream().filter(c -> c.getId() == cardId).
            findFirst().orElseThrow(() -> new IllegalArgumentException("Carte introuvable"));

    Card topCard = game.getTopCard();

    if (!card.isPlayable(topCard.getColor(), topCard.getValue()))
      throw new IllegalArgumentException("Cette carte ne peut pas être jouée");

    player.playCard(card);

    switch (card.getValue()) {
      case REVERSE -> game.reverseDirection();
      case SKIP -> game.updateCurrentPlayerIndex();
     // case DRAW_TWO -> drawCards(game, game.get);
    }


  }
}
