package fr.upjv.uno.model.enums;

/**
 * Représente l'état d'une partie.
 */
public enum GameStatus {
  /**
   * Partie en attente de joueurs pour démarrer.
   */
  WAITING_FOR_PLAYERS,
  /**
   * Partie en cours.
   */
  IN_PROGRESS,
  /**
   * Partie terminée.
   */
  FINISHED
}
