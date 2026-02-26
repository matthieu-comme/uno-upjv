package fr.upjv.uno.util;

import java.security.SecureRandom;

/**
 * Permet de générer un identifiant pour Game.
 */
public class GameCodeGenerator {
  private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private static final int CODE_LENGTH = 8;
  private static final SecureRandom RANDOM = new SecureRandom();

  /**
   * Génère un code alphanumérique aléatoire.
   *
   * @return chaine de longueur {@code CODE_LENGTH}
   */
  public static String generateCode() {
    StringBuilder code = new StringBuilder(CODE_LENGTH);
    char randomChar;

    for (int i = 0; i < CODE_LENGTH; i++) {
      randomChar = CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length()));
      code.append(randomChar);
    }
    return code.toString();
  }
}