package fr.upjv.uno.model;

import lombok.*;

import java.util.List;

/**
 * Représente un joueur.
 */
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Player {

  @EqualsAndHashCode.Include // 2 joueurs sont égaux s'ils ont le même id
  private String id;

  private String name;

  private boolean isConnected;

  @ToString.Exclude // pour éviter de spam les logs
  private Hand hand = new Hand();

  /**
   * @param id   Identifiant unique du joueur.
   * @param name Nom du joueur.
   */
  public Player(String id, String name) {
    this.id = id;
    this.name = name;
    this.isConnected = true;
  }

  /**
   * Piocher : ajoute une carte à la main.
   *
   * @param card carte piochée.
   */
  public void drawCard(Card card) {
    if (card == null)
      throw new IllegalArgumentException("On ne peut pas piocher une carte nulle");

    this.hand.add(card);
  }

  /**
   * Jouer : supprime une carte de la main.
   * Suppose que la validation des règles a déjà été faite.
   *
   * @param card carte jouée.
   */
  public void playCard(Card card) {
    boolean removed = hand.remove(card);

    if (!removed)
      throw new IllegalStateException("Le joueur " + name + " essaie de jouer une carte qu'il n'a pas : " + card);
  }

  /**
   * @return nombre de cartes
   */
  public int getHandSize() {
    return hand.getSize();
  }

  /**
   * Indique si le joueur est en position de Uno.
   *
   * @return {@code true} si Uno, {@code false} sinon.
   */
  public boolean hasUno() {
    return getHandSize() == 1;
  }

  /**
   * Indique si le joueur a la main vide.
   *
   * @return {@code true} si la main est vide, {@code false} sinon.
   */
  public boolean hasEmptyHand() {
    return hand.isEmpty();
  }

  /**
   * Indique si le joueur possède la carte dans sa main.
   *
   * @param card Carte à chercher
   * @return {@code true} si le joueur a la carte, {@code false} sinon.
   */
  public boolean hasThisCard(Card card) {
    return hand.contains(card);
  }

  /**
   * Getter sécurisé.
   *
   * @return une liste copie de la main.
   */
  public List<Card> getCards() {
    return hand.getCards();
  }

}
