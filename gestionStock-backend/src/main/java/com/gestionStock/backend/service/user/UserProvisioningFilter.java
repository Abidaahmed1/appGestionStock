package com.gestionStock.backend.service.user;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import com.gestionStock.backend.entity.user.Role;
import java.util.Map;
import java.util.List;

@Component
public class UserProvisioningFilter implements Filter {
    private final UserService userService;

    public UserProvisioningFilter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            System.out.println("UserProvisioningFilter: Utilisateur authentifié détecté: " + jwt.getSubject());
            String id = jwt.getSubject();
            String firstName = jwt.getClaimAsString("given_name") != null ? jwt.getClaimAsString("given_name") : "";
            String lastName = jwt.getClaimAsString("family_name") != null ? jwt.getClaimAsString("family_name") : "";
            String email = jwt.getClaimAsString("email");

            if (email != null) {
                Role userRole = Role.MAGASINIER;
                Map<String, Object> realmAccess = jwt.getClaim("realm_access");
                if (realmAccess != null && realmAccess.containsKey("roles")) {
                    @SuppressWarnings("unchecked")
                    List<String> roles = (List<String>) realmAccess.get("roles");
                    for (String r : roles) {
                        try {
                            userRole = Role.valueOf(r.toUpperCase().replace(" ", "_"));
                            break;
                        } catch (Exception e) {
                        }
                    }
                }

                userService.provisionUserIfNeeded(id, firstName, lastName, email, userRole);
            } else {
                System.err.println("UserProvisioningFilter: Email manquant dans le token pour l'ID: " + id);
            }
        } else {
            System.out.println(
                    "UserProvisioningFilter: Aucune authentification JWT trouvée dans le contexte à ce stade.");
        }
        chain.doFilter(request, response);
    }
}