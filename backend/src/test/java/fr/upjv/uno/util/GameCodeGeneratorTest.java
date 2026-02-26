package fr.upjv.uno.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Permet de tester unitairement la classe statique GameCodeGenerator.
 */
public class GameCodeGeneratorTest {

  @Test
  @DisplayName("Doit générer un code de 8 caractères")
  void shouldGenerateCodeOfLengthEight() {
    String code = GameCodeGenerator.generateCode();
    assertThat(code).hasSize(8);
  }

  @Test
  @DisplayName("Doit contenir uniquement des lettres majuscules et des chiffres")
  void shouldContainOnlyAllowedCharacters() {
    String code = GameCodeGenerator.generateCode();
    assertThat(code).matches("^[A-Z0-9]{8}$");
  }

  @Test
  @DisplayName("Ne doit pas retourner null")
  void shouldNotBeNull() {
    String code = GameCodeGenerator.generateCode();
    assertThat(code).isNotNull();
  }

  @Test
  @DisplayName("Doit générer des codes différents (très haute probabilité)")
  void shouldGenerateDifferentCodes() {
    String code1 = GameCodeGenerator.generateCode();
    String code2 = GameCodeGenerator.generateCode();
    assertThat(code1).isNotEqualTo(code2);
  }
}
