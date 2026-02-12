package fr.comme.fettah.uno_upjv.model;

import fr.comme.fettah.uno_upjv.model.enums.Color;
import fr.comme.fettah.uno_upjv.model.enums.Value;
import lombok.AccessLevel;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Représente la main d'un joueur.
 */
@Data
@NoArgsConstructor
public class Hand {
  @Getter(AccessLevel.NONE)
  private List<Card> cards = new ArrayList<>();

  /**
   * Getter sécurisé pour éviter qu'on modifie la main.
   *
   * @return une liste copie de la main.
   */
  public List<Card> getCards() {
    return new ArrayList<>(this.cards);
  }

  /**
   * Ajoute une carte dans la main.
   *
   * @param card Carte à ajouter dans la main.
   * @return {@code true} si la main est modifiée, {@code false} sinon (jamais en vrai).
   */
  public boolean add(Card card) {
    return cards.add(card);
  }

  /**
   * Supprime une carte de la main.
   *
   * @param card Carte à supprimer de la main.
   * @return {@code true} si la main est modifiée, {@code false} sinon.
   */
  public boolean remove(Card card) {
    return cards.remove(card);
  }

  /**
   * @return le nombre de cartes de la main.
   */
  public int getCardCount() {
    return cards.size();
  }

  /**
   * Additionne le score de chaque carte pour obtenir le score de la main.
   *
   * @return le nombre de points de la main.
   */
  public int getPoints() {
    int handPoints = 0;

    for (Card card : cards)
      handPoints += card.getPoints();

    return handPoints;
  }

  /**
   * Indique si la main contient une carte pouvant être jouée.
   *
   * @param activeColor Couleur demandée.
   * @param activeValue Valeur demandée.
   * @return {@code true} si une carte est jouable, {@code false} sinon.
   */
  public boolean hasPlayableCard(Color activeColor, Value activeValue) {
    for (Card card : cards) {
      if (card.isPlayable(activeColor, activeValue))
        return true;
    }

    return false;
  }

  /**
   * Cherche une carte de la main via son ID.
   *
   * @param cardId ID de la carte à chercher.
   * @return la carte si elle est trouvée, nulle sinon.
   */
  public Card getCardById(int cardId) {
    for (Card card : cards) {
      if (cardId == card.getId())
        return card;
    }

    return null;
  }

  /**
   * Vide la main de ses cartes.
   */
  public void clear() {
    cards.clear();
  }
}
