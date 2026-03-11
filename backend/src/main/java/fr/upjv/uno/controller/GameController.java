package fr.upjv.uno.controller;

import fr.upjv.uno.dto.request.HelloMessage;
import fr.upjv.uno.dto.response.Greeting;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.util.HtmlUtils;

@Controller
public class GameController {

  @MessageMapping("/hello")
  @SendTo("/topic/greetings")
  public Greeting greeting(HelloMessage message) throws Exception {
    return new Greeting("Hello, " + HtmlUtils.htmlEscape(message.getName()) + " !");
  }
}