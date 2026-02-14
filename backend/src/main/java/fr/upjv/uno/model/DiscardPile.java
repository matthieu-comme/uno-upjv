package fr.upjv.uno.model;


import java.util.ArrayList;
import java.util.List;

/**
 * Représente la pile de défausse, où les cartes sont placées une fois jouées.
 * Liste où le dernier élément est le sommet de la pile.
 */
public class DiscardPile {
  private List<Card> cards;

  /**
   * Constructeur par défaut.
   */
  public DiscardPile() {
    this.cards = new ArrayList<>();
  }

  /**
   * Permet d'ajouter une carte sur la pile de défausse.
   *
   * @param card Carte à ajouter dans la défausse.
   */
  public void add(Card card) {
    cards.add(card);
  }

  /**
   * Permet d'obtenir la carte visible au sommet de la pile.
   *
   * @return le sommet de la pile.
   */
  public Card getTopCard() {
    if (cards.isEmpty())
      return null;

    return cards.get(cards.size() - 1);

  }

  /**
   * Extrait toutes les cartes sauf le sommet de la défausse.
   *
   * @return liste de cartes privée de son sommet.
   */
  public List<Card> extractAllButTopCard() {
    if (cards.isEmpty())
      return new ArrayList<>();

    Card topCard = getTopCard();

    List<Card> extractedCards = new ArrayList<>(cards.subList(0, cards.size() - 1));

    cards.clear();
    add(topCard);

    return extractedCards;
  }

  /**
   * Indique si la pile de défausse est vide.
   *
   * @return {@code true} si la défausse est vide, {@code false} sinon.
   */
  public boolean isEmpty() {
    return cards.isEmpty();
  }

  /**
   * Getter sécurisé.
   *
   * @return liste de cartes.
   */
  public List<Card> getCards() {
    return new ArrayList<>(cards);
  }

}
