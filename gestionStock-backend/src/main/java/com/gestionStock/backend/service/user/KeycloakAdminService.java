package com.gestionStock.backend.service.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

import java.util.HashMap;
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
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {
                })
                .block());
    }

    public String createUser(Map<String, Object> user) {
        return executeWithRetry(() -> {
            var response = webClient.post()
                    .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users")
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .bodyValue(user)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            res -> res.bodyToMono(String.class).flatMap(body -> {
                                return Mono.error(new RuntimeException("Keycloak error: " + body));
                            }))
                    .toBodilessEntity()
                    .block();

            String location = response.getHeaders().getLocation().getPath();
            return location.substring(location.lastIndexOf("/") + 1);
        });
    }

    public Map<String, Object> getUserByEmail(String email) {
        return executeWithRetry(() -> {
            String url = keycloakServerUrl + "/admin/realms/" + targetRealm + "/users?email=" + email + "&exact=true";
            List<Map<String, Object>> users = webClient.get()
                    .uri(url)
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {
                    })
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

    public void updateUserEnabledStatus(String id, boolean enabled) {
        executeWithRetry(() -> {
            Map<String, Object> update = new HashMap<>();
            update.put("enabled", enabled);

            webClient.put()
                    .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + id)
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .bodyValue(update)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            return null;
        });
    }

    public void updateUserProfile(String id, String firstName, String lastName, String email) {
        executeWithRetry(() -> {
            Map<String, Object> update = new HashMap<>();
            update.put("firstName", firstName);
            update.put("lastName", lastName);
            update.put("email", email);
            update.put("emailVerified", true);

            webClient.put()
                    .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + id)
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .bodyValue(update)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            return null;
        });
    }

    public void resetUserPassword(String id, String newPassword) {
        executeWithRetry(() -> {
            Map<String, Object> passwordCred = new HashMap<>();
            passwordCred.put("type", "password");
            passwordCred.put("value", newPassword);
            passwordCred.put("temporary", false);

            webClient.put()
                    .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + id + "/reset-password")
                    .headers(h -> h.setBearerAuth(getAdminToken()))
                    .bodyValue(passwordCred)
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
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {
                })
                .block();
    }

    public void assignRole(String userId, String roleName) {
        Map<String, Object> role = getRealmRole(roleName);
        if (role == null) {
            throw new RuntimeException("Le rôle '" + roleName + "' n'existe pas dans le realm " + targetRealm);
        }

        webClient.post()
                .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + userId + "/role-mappings/realm")
                .headers(h -> h.setBearerAuth(getAdminToken()))
                .bodyValue(List.of(role))
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                        response -> response.bodyToMono(String.class).flatMap(body -> {
                            return Mono.error(new RuntimeException("Erreur assignation rôle Keycloak: " + body));
                        }))
                .bodyToMono(Void.class)
                .block();
    }

    public void removeRole(String userId, String roleName) {
        Map<String, Object> role = getRealmRole(roleName);
        if (role == null)
            return;

        webClient.method(org.springframework.http.HttpMethod.DELETE)
                .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/users/" + userId + "/role-mappings/realm")
                .headers(h -> h.setBearerAuth(getAdminToken()))
                .bodyValue(List.of(role))
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    public Map<String, Object> getRealmRole(String roleName) {
        return executeWithRetry(() -> {
            try {
                return webClient.get()
                        .uri(keycloakServerUrl + "/admin/realms/" + targetRealm + "/roles/" + roleName)
                        .headers(h -> h.setBearerAuth(getAdminToken()))
                        .retrieve()
                        .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block();
            } catch (Exception e) {
                System.err.println("KeycloakAdminService: Rôle non trouvé: " + roleName);
                return null;
            }
        });
    }

    private String getAdminToken() {
        if (adminToken == null) {

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
                        .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                        })
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
