package fr.comme.fettah.uno_upjv.model;

import lombok.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Représente le deck (la pioche) d'un jeu de cartes.
 */

public class Deck {
  private final List<Card> cards;

  /**
   * Constructeur par défaut, deck vide.
   */
  public Deck() {
    this.cards = new ArrayList<>();
  }

  /**
   * Constructeur à partir d'une liste de cartes.
   *
   * @param cardList liste de cartes à utiliser (copie).
   */
  public Deck(List<Card> cardList) {
    this.cards = new ArrayList<>(cardList);
  }

  /**
   * Getter sécurisé du deck.
   *
   * @return une copie de la liste de cartes du deck.
   */
  public List<Card> getCards() {
    return new ArrayList<>(this.cards);
  }

  /**
   * @return le nombre de cartes de la main.
   */
  public int getCardCount() {
    return cards.size();
  }

  /**
   * Remplit le deck avec une liste de cartes.
   *
   * @param cardsToInsert la liste de carte à ajouter (non nul).
   * @return {@code true} si toutes les insertions ont réussi, {@code false} sinon.
   */
  public boolean refill(List<Card> cardsToInsert) {
    if (cardsToInsert == null || cardsToInsert.isEmpty())
      return false;

    return this.cards.addAll(cardsToInsert);
  }

  /**
   * Mélange le deck.
   */
  public void shuffle() {
    Collections.shuffle(this.cards);
  }

  /**
   * Indique si le deck est vide.
   *
   * @return {@code true} si le deck est vide, {@code false} sinon.
   */
  public boolean isEmpty() {
    return cards.isEmpty();
  }

  /**
   * Supprime la carte au sommet du deck et la retourne.
   *
   * @return carte piochée, null si le deck est vide.
   */
  public Card draw() {
    if (isEmpty())
      return null;

    return cards.remove(cards.size() - 1);
  }
}
