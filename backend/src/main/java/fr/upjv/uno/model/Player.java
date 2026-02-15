package fr.upjv.uno.model;

import lombok.*;

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
}
