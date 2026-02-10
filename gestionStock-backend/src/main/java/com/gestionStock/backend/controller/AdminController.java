package com.gestionStock.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.gestionStock.backend.service.user.KeycloakAdminService;
import com.gestionStock.backend.service.user.UserService;

@RestController
@RequestMapping("/api/admin/users")
public class AdminController {

    private final KeycloakAdminService adminService;
    private final UserService userService;

    public AdminController(KeycloakAdminService adminService, UserService userService) {
        this.adminService = adminService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        try {
            return ResponseEntity.ok(adminService.getAllUsers());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la récupération des utilisateurs: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> user) {
        String email = (String) user.get("email");
        try {
            // 1. Essayer de créer l'utilisateur dans Keycloak
            adminService.createUser(user);
            System.out.println("AdminController: Utilisateur créé dans Keycloak: " + email);
        } catch (Exception e) {
            // Si l'utilisateur existe déjà, on ne bloque pas, on va tenter la synchro
            if (e.getMessage() != null && e.getMessage().contains("exists")) {
                System.out.println("AdminController: L'utilisateur " + email
                        + " existe déjà dans Keycloak. Vérification de la synchro Postgres...");
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
            }
        }

        try {
            // 2. Récupérer l'utilisateur (créé ou existant) pour avoir son ID Keycloak
            Map<String, Object> keycloakUser = adminService.getUserByEmail(email);

            if (keycloakUser != null) {
                // 3. Enregistrer/Vérifier dans la base locale Postgres
                userService.provisionUserIfNeeded(
                        (String) keycloakUser.get("id"),
                        (String) keycloakUser.get("firstName"),
                        (String) keycloakUser.get("lastName"),
                        email);
                System.out.println("AdminController: Utilisateur synchronisé dans Postgres: " + email);
                return ResponseEntity.ok("Utilisateur synchronisé avec succès");
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Utilisateur non trouvé dans Keycloak après tentative de création");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la synchronisation: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        try {
            adminService.deleteUser(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/roles")
    public List<Map<String, Object>> getUserRoles(@PathVariable String id) {
        return adminService.getUserRoles(id);
    }

    @PostMapping("/{id}/roles/{roleName}")
    public ResponseEntity<?> assignRole(@PathVariable String id, @PathVariable String roleName) {
        try {
            adminService.assignRole(id, roleName);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}/roles/{roleName}")
    public ResponseEntity<?> removeRole(@PathVariable String id, @PathVariable String roleName) {
        try {
            adminService.removeRole(id, roleName);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
