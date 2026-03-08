package fr.upjv.uno.model;

import fr.upjv.uno.model.enums.Color;
import fr.upjv.uno.model.enums.Difficulty;
import fr.upjv.uno.model.enums.Value;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.List;
import java.util.Random;

/**
 * Représente un joueur contrôlé par un bot.
 */
@Getter
@Setter
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class AIPlayer extends Player {
  private Difficulty difficulty;

  /**
   *
   * @param id         Identifiant unique du bot.
   * @param name       Nom du bot.
   * @param difficulty Niveau du bot.
   */
  public AIPlayer(String id, String name, Difficulty difficulty) {
    super(id, name);
    this.difficulty = difficulty;
  }

  /**
   * Détermine l'action à faire en fonction du niveau de difficulté du bot.
   *
   * @param activeColor Couleur demandée.
   * @param activeValue Valeur demandée.
   * @return {@code Card} si une carte est jouable, {@code null} sinon.
   */
  public Card chooseCardToPlay(Color activeColor, Value activeValue) {
    List<Card> playableCards = getHand().getPlayableCards(activeColor, activeValue);

    if (playableCards.isEmpty())
      return null;

    return switch (difficulty) {
      case EASY -> chooseLowestValueCard(playableCards);
      case HARD -> chooseHighestValueCard(playableCards);
      case RANDOM -> chooseRandomCard(playableCards);
    };

  }

  private Card chooseLowestValueCard(List<Card> playableCards) {
    int min = Integer.MAX_VALUE;
    Card worstCard = null;

    for (Card card : playableCards) {
      if (card.getPoints() < min) {
        min = card.getPoints();
        worstCard = card;
      }
    }
    return worstCard;
  }

  private Card chooseHighestValueCard(List<Card> playableCards) {
    int max = Integer.MIN_VALUE;
    Card bestCard = null;

    for (Card card : playableCards) {
      if (card.getPoints() > max) {
        max = card.getPoints();
        bestCard = card;
      }
    }
    return bestCard;
  }

  private Card chooseRandomCard(List<Card> playableCards) {
    int randomIndex = new Random().nextInt(playableCards.size());
    return playableCards.get(randomIndex);
  }

  /**
   * Choisis une couleur en fonction de la difficulté du bot.
   * <p>
   * Si c'est HARD, le bot choisit la couleur qu'il possède en majorité.
   * Sinon, il choisit une couleur aléatoire.
   * </p>
   *
   * @return Color choisie
   */
  public Color chooseColor() {
    if (difficulty == Difficulty.HARD)
      return chooseMostColor();
    else {
      Color[] colors = {Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW};
      return colors[new Random().nextInt(colors.length)];
    }
  }

  private Color chooseMostColor() {
    int redCount = 0;
    int greenCount = 0;
    int blueCount = 0;
    int yellowCount = 0;

    for (Card card : getCards()) {
      if (card.getColor() == Color.BLACK)
        continue;

      switch (card.getColor()) {
        case RED -> redCount++;
        case GREEN -> greenCount++;
        case BLUE -> blueCount++;
        case YELLOW -> yellowCount++;
      }
    }
    Color bestColor = Color.RED;
    int maxCount = redCount;

    if (greenCount > maxCount) {
      maxCount = greenCount;
      bestColor = Color.GREEN;
    }

    if (blueCount > maxCount) {
      maxCount = blueCount;
      bestColor = Color.BLUE;
    }

    if (yellowCount > maxCount) {
      maxCount = yellowCount;
      bestColor = Color.YELLOW;
    }

    // s'il n'a que des jokers
    if (maxCount == 0) {
      Color[] colors = {Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW};
      return colors[new Random().nextInt(colors.length)];
    }

    return bestColor;
  }


}
