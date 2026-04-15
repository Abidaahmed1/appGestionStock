package com.gestionStock.backend.service.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class InvitationEmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${keycloak.realm}")
    private String realm;

    public void sendInvitationEmail(String toEmail, String firstName, String password) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject("Bienvenue sur Gestion Stock - Définissez votre mot de passe");

        // Lien direct vers la page de connexion de l'espace compte
        String loginUrl = "http://localhost:4200";

        String content = "<h3>Bonjour " + (firstName != null ? firstName : "") + ",</h3>"
                + "<p>Votre compte a été créé. Pour vous connecter, utilisez les identifiants suivants :</p>"
                + "<div style='background:#f4f4f4;padding:15px;border-radius:5px;margin:20px 0;'>"
                + "<strong>Login :</strong> " + toEmail + "<br>"
                + "<strong>Mot de passe provisoire :</strong> <span style='color:#d9534f;font-family:monospace;font-size:1.2em;'>"
                + password + "</span>"
                + "</div>"
                + "<p>Veuillez cliquer sur le bouton ci-dessous pour vous connecter. Vous devrez changer ce mot de passe dès votre première connexion.</p>"
                + "<a href='" + loginUrl
                + "' style='display:inline-block;background:#28a745;color:white;padding:12px 25px;text-decoration:none;border-radius:5px;font-weight:bold;'>Se connecter maintenant</a>"
                + "<p>Merci,<br>L'équipe Gestion Stock</p>";

        helper.setText(content, true);
        mailSender.send(message);
    }
}
