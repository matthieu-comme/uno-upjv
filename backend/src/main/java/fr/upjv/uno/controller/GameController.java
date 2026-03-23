package fr.upjv.uno.controller;

import fr.upjv.uno.dto.request.*;
import fr.upjv.uno.dto.response.CardDTO;
import fr.upjv.uno.dto.response.GameStateDTO;
import fr.upjv.uno.dto.response.Greeting;
import fr.upjv.uno.dto.response.PlayerDTO;
import fr.upjv.uno.model.Card;
import fr.upjv.uno.model.Game;
import fr.upjv.uno.model.Player;
import fr.upjv.uno.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.HtmlUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
// TODO: voir pioche et son nombre de cartes
// TODO: message d'erreur quand on rejoint directement via le lien et non par le menu
// TODO: timer limitant le temps de jeu par action

/**
 * Contrôleur REST gérant les requêtes liées aux parties de Uno.
 * <p>
 * Création, join et le déroulement du jeu.
 * Utilise {@link org.springframework.messaging.simp.SimpMessagingTemplate} pour diffuser
 * l'état de la partie en temps réel via WebSockets de manière sécurisée (mains adverses masquées).
 * </p>
 */

@RestController
@RequestMapping("/api/games")
@Controller
public class GameController {
  private final GameService gameService;
  private final SimpMessagingTemplate messagingTemplate;

  /**
   * Controller gérant les requêtes liées aux parties de Uno.
   *
   * @param gameService       service Uno.
   * @param messagingTemplate template de message.
   */
  public GameController(GameService gameService, SimpMessagingTemplate messagingTemplate) {
    this.gameService = gameService;
    this.messagingTemplate = messagingTemplate;
  }

  /**
   * Sert de Hello World.
   *
   * @param message message.
   * @return Greeting.
   */
  @MessageMapping("/hello")
  @SendTo("/topic/greetings")
  public Greeting greeting(HelloMessage message) {
    return new Greeting("Hello, " + HtmlUtils.htmlEscape(message.getName()) + " !");
  }

  /**
   * Crée une nouvelle partie avec les paramètres spécifiés.
   *
   * @param request Contient les paramètres de création : nombre de joueurs, mode de jeu.
   * @return ResponseEntity contenant l'état initial de la partie (GameStateDTO).
   */
  @PostMapping("/create")
  public ResponseEntity<GameStateDTO> createGame(@RequestBody CreateGameRequest request) {
    Game game = gameService.createGame(request.getMaxPlayers(), request.getGameMode());
    return ResponseEntity.ok(mapToGameStateDTO(game, null));
  }

  /**
   * Ajoute un nouveau joueur à une partie existante via son identifiant.
   * Diffuse automatiquement le nouvel état de la partie à tous les joueurs déjà connectés.
   *
   * @param gameId  Identifiant unique de la partie à rejoindre.
   * @param request Objet contenant les informations du joueur (pseudonyme).
   * @return ResponseEntity contenant l'état de la partie mis à jour pour le nouveau joueur.
   */
  @PostMapping("/{gameId}/join")
  public ResponseEntity<?> joinGame(@PathVariable String gameId, @RequestBody JoinGameRequest request) {
    String cleanName = request.getPlayerName() != null ? request.getPlayerName().trim() : "Anonyme";
    Player newPlayer = new Player(UUID.randomUUID().toString(), cleanName);
    try {
      Game game = gameService.joinGame(gameId, newPlayer);
      broadcastGameState(game);
      return ResponseEntity.ok(mapToGameStateDTO(game, newPlayer.getId()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  /**
   * Démarre la partie depuis le lobby.
   *
   * @param gameId Identifiant de la partie.
   * @return OK si valide, BadRequest sinon.
   */
  @PostMapping("/{gameId}/start")
  public ResponseEntity<Void> startGame(@PathVariable String gameId) {
    try {
      gameService.startGame(gameId);

      Game game = gameService.getGame(gameId);
      broadcastGameState(game);

      return ResponseEntity.ok().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }

  /**
   * Réinitialise la partie avec les joueurs actuels pour une nouvelle manche.
   *
   * @param gameId Identifiant de la partie terminée.
   * @return OK si valide, BadRequest sinon.
   */
  @PostMapping("/{gameId}/restart")
  public ResponseEntity<Void> restartGame(@PathVariable String gameId) {
    try {
      gameService.restartGame(gameId);

      Game game = gameService.getGame(gameId);
      broadcastGameState(game);

      return ResponseEntity.ok().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }

  /**
   * Retire un joueur de la partie ou du lobby.
   *
   * @param gameId  Identifiant de la partie.
   * @param request Requête contenant l'identifiant du joueur qui quitte.
   * @return OK si valide, BadRequest sinon.
   */
  @PostMapping("/{gameId}/leave")
  public ResponseEntity<Void> leaveGame(@PathVariable String gameId, @RequestBody LeaveGameRequest request) {
    try {
      gameService.leaveGame(gameId, request.getPlayerId());

      try {
        Game game = gameService.getGame(gameId);
        broadcastGameState(game);
      } catch (IllegalArgumentException e) {
        // La partie a été delete car le dernier joueur est parti.
      }

      return ResponseEntity.ok().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }

  /**
   * Traite l'action d'un joueur tentant de jouer une carte pendant son tour.
   * Si l'action est valide, met à jour l'état du jeu et le diffuse à tous les joueurs.
   *
   * @param gameId  id de la partie.
   * @param request action du joueur.
   * @return OK si action valide, BadRequest sinon.
   */
  @PostMapping("/{gameId}/play")
  public ResponseEntity<Void> playCard(@PathVariable String gameId, @RequestBody PlayCardRequest request) {

    try {
      gameService.playCard(gameId, request.getPlayerId(), request.getCardId(), request.getChosenColor());
      Game game = gameService.getGame(gameId);
      broadcastGameState(game);
      return ResponseEntity.ok().build();

    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }


  /**
   * Permet à un joueur de piocher volontairement une carte pendant son tour.
   *
   * @param gameId  Identifiant de la partie.
   * @param request Requête contenant l'identifiant du joueur.
   * @return OK si l'action est valide, BadRequest sinon.
   */
  @PostMapping("/{gameId}/draw")
  public ResponseEntity<Void> chooseToDraw(@PathVariable String gameId, @RequestBody DrawCardRequest request) {
    try {
      gameService.chooseToDraw(gameId, request.getPlayerId());

      Game game = gameService.getGame(gameId);
      broadcastGameState(game);

      return ResponseEntity.ok().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }

  private void broadcastGameState(Game game) {
    for (Player player : game.getPlayers()) {
      messagingTemplate.convertAndSend(
              "/topic/game/" + game.getId() + "/" + player.getId(),
              mapToGameStateDTO(game, player.getId())
      );
    }
  }

  private GameStateDTO mapToGameStateDTO(Game game, String targetPlayerId) {
    List<PlayerDTO> playerDTOs = game.getPlayers().stream()
            .map(p -> PlayerDTO.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .isConnected(p.isConnected())
                    .handSize(p.getHandSize())
                    .hasUno(p.hasUno())
                    .build())
            .collect(Collectors.toList());

    List<CardDTO> myHand = null;
    if (targetPlayerId != null) {
      Player targetPlayer = game.findPlayerById(targetPlayerId);
      if (targetPlayer != null) {
        myHand = targetPlayer.getCards().stream()
                .map(c -> new CardDTO(c.getId(), c.getColor(), c.getValue()))
                .collect(Collectors.toList());
      }
    }

    CardDTO topCardDTO = null;
    Card topCard = game.getTopCard();
    if (topCard != null) {
      topCardDTO = new CardDTO(topCard.getId(), topCard.getColor(), topCard.getValue());
    }

    return GameStateDTO.builder()
            .gameId(game.getId())
            .status(game.getStatus())
            .direction(game.getDirection())
            .activeColor(game.getActiveColor())
            .topCard(topCardDTO)
            .deckSize(game.getDeck().getSize())
            .currentPlayerIndex(game.getCurrentPlayerIndex())
            .players(playerDTOs)
            .myHand(myHand)
            .build();
  }
}
