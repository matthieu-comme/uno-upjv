package fr.upjv.uno.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration globale de l'app web pour les requêtes HTTP REST.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  /**
   * Configure les règles de CORS (Cross-Origin Resource Sharing).
   * Autorise le client front-end (React) à interroger l'API sans être bloqué par le navigateur.
   *
   * @param registry Le registre permettant de définir les chemins, origines et méthodes autorisés.
   */
  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
            .allowedOrigins("http://localhost:3000", "http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
  }
}