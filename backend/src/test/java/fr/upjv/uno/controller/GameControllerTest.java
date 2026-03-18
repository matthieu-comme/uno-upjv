package fr.upjv.uno.controller;
/*
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.upjv.uno.dto.request.CreateGameRequest;
import fr.upjv.uno.dto.request.JoinGameRequest;
import fr.upjv.uno.dto.request.PlayCardRequest;
import fr.upjv.uno.model.Deck;
import fr.upjv.uno.model.DiscardPile;
import fr.upjv.uno.model.Game;
import fr.upjv.uno.model.Player;
import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.GameStatus;
import fr.upjv.uno.service.GameService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.ExceptionHandler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GameController.class)
class GameControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @MockitoBean
  private GameService gameService;

  @MockitoBean
  private SimpMessagingTemplate messagingTemplate;

  private Game mockGame;

  @BeforeEach
  void setUp() {
    mockGame = new Game("game123", new Deck(), new DiscardPile(), 4); //
    mockGame.setStatus(GameStatus.WAITING_FOR_PLAYERS); //
    Player player = new Player("player123", "Alice"); //
    mockGame.addPlayer(player); //
  }

  @Test
  @DisplayName("Doit créer une partie et retourner l'état initial quand la requête est valide")
  void shouldCreateGameAndReturnGameStateWhenRequestIsValid() throws Exception {
    CreateGameRequest request = new CreateGameRequest();
    request.setMaxPlayers(4);
    request.setGameMode("Standard");

    Mockito.when(gameService.createGame(4, "Standard")).thenReturn(mockGame); //

    mockMvc.perform(post("/api/games/create")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameId").value("game123"))
            .andExpect(jsonPath("$.status").value("WAITING_FOR_PLAYERS"));
  }

  @Test
  @DisplayName("Doit rejoindre la partie, diffuser l'état et retourner les données quand la requête est valide")
  void shouldJoinGameBroadcastStateAndReturnGameStateWhenRequestIsValid() throws Exception {
    JoinGameRequest request = new JoinGameRequest();
    request.setPlayerName("Bob");

    Mockito.when(gameService.joinGame(eq("game123"), any(Player.class))).thenReturn(mockGame); //

    mockMvc.perform(post("/api/games/game123/join")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameId").value("game123"));

    // Vérifie que le WebSocket a bien diffusé l'état au(x) joueur(s)
    Mockito.verify(messagingTemplate, Mockito.times(1))
            .convertAndSend(anyString(), any(Object.class));
  }

  @Test
  @DisplayName("Doit jouer une carte et diffuser le nouvel état de la partie quand la requête est valide")
  void shouldPlayCardAndBroadcastStateWhenRequestIsValid() throws Exception {
    PlayCardRequest request = new PlayCardRequest();
    request.setPlayerId("player123");
    request.setCardId(1);
    request.setChosenColor(Color.RED);

    Mockito.doNothing().when(gameService).playCard("game123", "player123", 1, Color.RED); //
    Mockito.when(gameService.getGame("game123")).thenReturn(mockGame); //

    mockMvc.perform(post("/api/games/game123/play")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());

    Mockito.verify(gameService, Mockito.times(1)).playCard("game123", "player123", 1, Color.RED); //
    Mockito.verify(messagingTemplate, Mockito.times(1))
            .convertAndSend(anyString(), any(Object.class));
  }

  @Test
  @DisplayName("Doit renvoyer une erreur 400 si la partie n'existe pas lors de playCard")
  void shouldReturnBadRequestWhenGameNotFoundOnPlayCard() throws Exception {
    PlayCardRequest request = new PlayCardRequest();
    request.setPlayerId("player123");
    request.setCardId(1);

    Mockito.doThrow(new IllegalArgumentException("Partie introuvable"))
            .when(gameService).playCard("wrongGameId", "player123", 1, null);

    mockMvc.perform(post("/api/games/wrongGameId/play")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

    Mockito.verify(messagingTemplate, Mockito.never()).convertAndSend(anyString(), any(Object.class));
  }

  @Test
  @DisplayName("Doit renvoyer une erreur 400 si la carte est injouable")
  void shouldReturnBadRequestWhenCardIsUnplayable() throws Exception {
    PlayCardRequest request = new PlayCardRequest();
    request.setPlayerId("player123");
    request.setCardId(99);

    Mockito.doThrow(new IllegalArgumentException("Cette carte ne peut pas être jouée"))
            .when(gameService).playCard("game123", "player123", 99, null);

    mockMvc.perform(post("/api/games/game123/play")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

    Mockito.verify(messagingTemplate, Mockito.never()).convertAndSend(anyString(), any(Object.class));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
    return ResponseEntity.badRequest().body(ex.getMessage());
  }
}
 */