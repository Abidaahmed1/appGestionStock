package com.gestionStock.backend.service.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClient.RequestBodySpec;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Service
public class KeycloakAdminService {

    private final WebClient webClient;

    @Value("${keycloak.admin.server-url}")
    private String keycloakServerUrl;

    @Value("${keycloak.admin.realm}")
    private String adminRealm;

    @Value("${keycloak.admin.username}")
    private String adminUsername;

    @Value("${keycloak.admin.password}")
    private String adminPassword;

    @Value("${keycloak.admin.client-id}")
    private String adminClientId;

    @Value("${keycloak.target-realm}")
    private String targetRealm;

    private String adminToken;

    public KeycloakAdminService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();

    }

    public List<Map<String, Object>> getAllUsers() {
        return executeWithRetry(() -> webClient.get()
                .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users")
                .headers(h -> h.setBearerAuth(getAdminToken()))
                .retrieve()
                .bodyToMono(List.class)
                .block());
    }

    public void createUser(Map<String, Object> user) {
        executeWithRetry(() -> {
            webClient.post()
                    .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users")
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .bodyValue(user)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).flatMap(body -> {
                                return Mono.error(new RuntimeException("Keycloak error: " + body));
                            }))
                    .bodyToMono(Void.class)
                    .block();
            return null;
        });
    }

    public Map<String, Object> getUserByEmail(String email) {
        return executeWithRetry(() -> {
            String url = keycloakServerUrl + "/admin/realms/" + targetRealm + "/users?email=" + email + "&exact=true";
            List<Map<String, Object>> users = webClient.get()
                    .uri(url)
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            return (users != null && !users.isEmpty()) ? users.get(0) : null;
        });
    }

    private <T> T executeWithRetry(Supplier<T> action) {
        try {
            return action.get();
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("401") || msg.contains("Unauthorized")) {
                System.out.println(
                        "KeycloakAdminService: Token expiré (401). Tentative de rafraîchissement et réessai...");
                this.adminToken = null;
                return action.get();
            }
            throw e;
        }
    }

    public void deleteUser(String id) {
        executeWithRetry(() -> {
            webClient.delete()
                    .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + id)
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            return null;
        });
    }

    public List<Map<String, Object>> getUserRoles(String userId) {
        return webClient.get()
                .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + userId + "/role-mappings/realm")
                .headers(h -> h.setBearerAuth(getAdminToken()))
                .retrieve()
                .bodyToMono(List.class)
                .block();
    }

    public void assignRole(String userId, String roleName) {
        webClient.post()
                .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + userId + "/role-mappings/realm")
                .headers(h -> h.setBearerAuth(getAdminToken()))
                .bodyValue(List.of(Map.of("name", roleName)))
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    public void removeRole(String userId, String roleName) {
        ((RequestBodySpec) webClient.delete()
                .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + userId + "/role-mappings/realm")
                .headers(h -> h.setBearerAuth(getAdminToken())))
                .bodyValue(List.of(Map.of("name", roleName)))
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    private String getAdminToken() {
        if (adminToken == null) {
            // System.out.println("KeycloakAdminService: Tentative de récupération du token
            // admin...");
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("grant_type", "password");
            formData.add("client_id", adminClientId);
            formData.add("username", adminUsername);
            formData.add("password", adminPassword);

            try {
                Map<String, Object> tokenResponse = webClient.post()
                        .uri(keycloakServerUrl + "/realms/" + adminRealm + "/protocol/openid-connect/token")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(BodyInserters.fromFormData(formData))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                adminToken = (String) tokenResponse.get("access_token");
                if (adminToken != null) {
                    System.out.println("KeycloakAdminService: Token admin récupéré avec succès. (Début: "
                            + adminToken.substring(0, 10) + "...)");
                } else {
                    System.out
                            .println("KeycloakAdminService: ERREUR - Le token est null dans la réponse de Keycloak !");
                }
            } catch (Exception e) {
                System.out.println("KeycloakAdminService: ERREUR lors de la récupération du token: " + e.getMessage());
                throw e;
            }
        }
        return adminToken;
    }
}
