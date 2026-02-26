package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.GameStatus;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Représente l'état d'une partie de Uno.
 */
@Getter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Game {
  @EqualsAndHashCode.Include
  private final String id;

  @Setter
  private GameStatus status;

  private int direction; // = 1 si sens horaire, -1 si anti-horaire

  @Getter(AccessLevel.NONE)
  private final List<Player> players;

  private int currentPlayerIndex;

  private final Deck deck;

  private final DiscardPile discardPile;

  private final int maxPlayers;

  @Setter
  private Color activeColor;

  /**
   * @param id         Identifiant unique de la partie.
   * @param deck       Pioche à associer à la partie.
   * @param maxPlayers Nombre de joueurs maximal.
   */
  public Game(String id, Deck deck, int maxPlayers) {
    this.id = id;
    this.status = GameStatus.WAITING_FOR_PLAYERS;
    this.direction = 1;
    this.players = new ArrayList<>();
    this.currentPlayerIndex = 0;
    this.deck = deck;
    this.discardPile = new DiscardPile();
    this.maxPlayers = maxPlayers;
  }

  /**
   * Inverse le sens de direction du jeu.
   */
  public void reverseDirection() {
    direction *= -1;
  }

  /**
   * Met à jour l'index du joueur qui doit jouer en fonction du sens de jeu.
   */
  public void updateCurrentPlayerIndex() {
    int playersNumber = getPlayersNumber();
    currentPlayerIndex = (currentPlayerIndex + direction + playersNumber) % playersNumber;
  }

  /**
   * Inscrit un nouveau joueur dans la partie.
   * <p>
   * Cette méthode vérifie que la partie est dans un état permettant de recevoir des joueurs
   * et que la capacité maximale n'est pas encore atteinte.
   * </p>
   *
   * @param player le joueur à ajouter à la liste des participants, ne doit pas être {@code null}.
   * @throws IllegalArgumentException si le paramètre {@code player} est {@code null}.
   * @throws IllegalStateException    si la partie n'est plus en phase d'attente
   *                                  ou si le nombre maximal de joueurs est atteint.
   */
  public void addPlayer(Player player) {
    if (player == null)
      throw new IllegalArgumentException("Erreur: aucun joueur à ajouter");
    if (status != GameStatus.WAITING_FOR_PLAYERS)
      throw new IllegalStateException("Impossible de rejoindre : partie en cours");
    if (getPlayersNumber() >= maxPlayers)
      throw new IllegalStateException("Impossible de rejoindre : la salle d'attente est pleine");

    players.add(player);
  }


  /**
   * Supprime un joueur de la liste, utilisable seulement si la partie est en attente.
   *
   * @param player Joueur à supprimer.
   * @return {@code true} s'il est supprimé, {@code false} sinon.
   */
  public boolean removePlayer(Player player) {
    if (status == GameStatus.WAITING_FOR_PLAYERS)
      return players.remove(player);
    return false;
  }

  /**
   * Cherche un joueur grâce à son identifiant.
   *
   * @param id Identifiant du joueur à chercher.
   * @return le joueur s'il est trouvé, {@code null} sinon.
   */
  public Player findPlayerById(String id) {
    for (Player player : players) {
      if (player.getId().equals(id))
        return player;
    }
    return null;
  }

  /**
   * @return joueur dont c'est le tour, {@code null} s'il n'y a aucun joueur.
   */
  public Player getCurrentPlayer() {
    if (getPlayersNumber() == 0)
      return null;
    return players.get(currentPlayerIndex);
  }

  /**
   * Indique si le joueur actuel a la main vide.
   *
   * @return {@code true} s'il a gagné, {@code false} sinon.
   */
  public boolean isWinner() {
    return getCurrentPlayer().hasEmptyHand();
  }

  /**
   * @return le nombre de joueurs dans la partie.
   */
  public int getPlayersNumber() {
    return players.size();
  }

  /**
   * @return copie de la liste des joueurs.
   */
  public List<Player> getPlayers() {
    return new ArrayList<>(players);
  }

}
