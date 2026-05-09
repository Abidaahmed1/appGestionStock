package com.gestionStock.backend.controller.user;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.service.user.KeycloakAdminService;
import com.gestionStock.backend.service.user.UserService;
import com.gestionStock.backend.service.user.InvitationEmailService;
import com.gestionStock.backend.entity.entreprise.Entreprise;

@RestController
@RequestMapping("/api/admin/users")
public class AdminController {

	private final KeycloakAdminService adminService;
	private final UserService userService;
	private final InvitationEmailService invitationEmailService;

	public AdminController(KeycloakAdminService adminService, UserService userService, InvitationEmailService invitationEmailService) {
		this.adminService = adminService;
		this.userService = userService;
		this.invitationEmailService = invitationEmailService;
	}

	@GetMapping
	public ResponseEntity<?> getAllUsers() {
		try {
			List<User> dbUsers = userService.getAllUsersComplete();
			if (dbUsers == null || dbUsers.isEmpty()) {
				return ResponseEntity.ok(new ArrayList<>());
			}

			List<Map<String, Object>> keycloakUsers = adminService.getAllUsers();

			Map<String, String> idToRole = new HashMap<>();
			Map<String, String> emailToRole = new HashMap<>();
			Set<String> allowedIds = new HashSet<>();
			Set<String> allowedEmails = new HashSet<>();

			for (User dbUser : dbUsers) {
				if (dbUser.getRole() != null) {
					if (dbUser.getId() != null) {
						idToRole.put(dbUser.getId(), dbUser.getRole().name());
						allowedIds.add(dbUser.getId());
					}
					if (dbUser.getEmail() != null) {
						emailToRole.put(dbUser.getEmail(), dbUser.getRole().name());
						allowedEmails.add(dbUser.getEmail());
					}
				}
			}

			List<Map<String, Object>> result = new ArrayList<>();

			for (Map<String, Object> kcUser : keycloakUsers) {
				String id = (String) kcUser.get("id");
				String email = (String) kcUser.get("email");

				boolean matchesEntreprise = (id != null && allowedIds.contains(id))
						|| (email != null && allowedEmails.contains(email));
				if (!matchesEntreprise) {
					continue;
				}

				if (id != null && idToRole.containsKey(id)) {
					kcUser.put("role", idToRole.get(id));
				} else if (email != null && emailToRole.containsKey(email)) {
					kcUser.put("role", emailToRole.get(email));
				} else {
					kcUser.put("role", "AUCUN");
				}

				result.add(kcUser);
			}

			return ResponseEntity.ok(result);
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Erreur lors de la récupération des utilisateurs: " + e.getMessage());
		}
	}

	@PostMapping
	public ResponseEntity<?> createUser(@RequestBody Map<String, Object> user) {
		if (userService.getCurrentUserEntreprise() == null) {
			Map<String, String> errorResponse = new HashMap<>();
			errorResponse.put("message",
					"Vous devez d'abord créer votre entreprise avant de pouvoir ajouter des utilisateurs.");
			return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errorResponse);
		}

		String email = (String) user.get("email");
		String userId;

		try {
			// Générer un mot de passe provisoire aléatoire
			String temporaryPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
			
			Map<String, Object> keycloakUserMap = new HashMap<>(user);
			keycloakUserMap.remove("role");
			
			// Ajouter le mot de passe provisoire pour Keycloak
			Map<String, Object> credentials = new HashMap<>();
			credentials.put("type", "password");
			credentials.put("value", temporaryPassword);
			credentials.put("temporary", true); // On marque comme temporaire
			keycloakUserMap.put("credentials", List.of(credentials));
			
			// Action requise pour forcer le changement immédiat
			keycloakUserMap.put("requiredActions", List.of("UPDATE_PASSWORD"));
			
			userId = adminService.createUser(keycloakUserMap);
			
			// Envoyer l'email d'invitation personnalisé avec le mot de passe
			try {
				String name=user.get("firstName")+" "+user.get("lastName");
				invitationEmailService.sendInvitationEmail(email, name, temporaryPassword);
				System.out.println("AdminController: Email avec mot de passe provisoire envoyé à " + email);
			} catch (Exception emailEx) {
				System.err.println("AdminController: Erreur lors de l'envoi de l'email Backend: " + emailEx.getMessage());
			}
		} catch (Exception e) {
			String errorMsg = e.getMessage();
			System.err.println("AdminController: Erreur lors de la création Keycloak pour " + email + ": " + errorMsg);

			if (errorMsg != null && (errorMsg.contains("exists") || errorMsg.contains("409"))) {
				Map<String, String> errorResponse = new HashMap<>();
				errorResponse.put("message", "Un utilisateur avec cet email ou ce nom d'utilisateur existe déjà.");
				return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
			}

			Map<String, String> errorResponse = new HashMap<>();
			errorResponse.put("message", errorMsg != null ? errorMsg : "Erreur lors de la création dans Keycloak");
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
		}

		try {
			String roleName = (String) user.get("role");
			Role userRole = Role.MAGASINIER;
			if (roleName != null) {
				try {
					userRole = Role.valueOf(roleName.toUpperCase().replace(" ", "_"));
				} catch (IllegalArgumentException e) {
					System.err.println("AdminController: Rôle invalide reçu: " + roleName + ". Utilisation du défaut.");
				}
			}

			try {
				String kcRole = mapToKeycloakRole(userRole.name());
				adminService.assignRole(userId, kcRole);
				System.out.println("AdminController: Rôle " + kcRole + " assigné à " + email + " dans Keycloak");
			} catch (Exception e) {
				System.err.println(
						"AdminController: Erreur lors de l'assignation Keycloak (" + userRole + "): " + e.getMessage());
			}

			User provisionedUser = userService.provisionUserIfNeeded(userId, (String) user.get("firstName"),
					(String) user.get("lastName"),
					email, userRole);

			Entreprise currentEntreprise = userService.getCurrentUserEntreprise();
			if (currentEntreprise != null && provisionedUser.getEntreprise() == null) {
				provisionedUser.setEntreprise(currentEntreprise);
				userService.createUser(provisionedUser); // Ceci effectue un save
				System.out.println("AdminController: Entreprise " + currentEntreprise.getNom()
						+ " assignée au nouvel utilisateur " + email);
			}

			System.out.println(
					"AdminController: Utilisateur " + email + " synchronisé dans Postgres avec le rôle: " + userRole);

			Map<String, Object> response = new HashMap<>();
			response.put("message", "Utilisateur créé avec succès");
			Map<String, Object> userRes = new HashMap<>(user);
			userRes.put("id", userId);
			response.put("user", userRes);

			return ResponseEntity.ok(response);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Erreur lors de la synchronisation: " + e.getMessage());
		}
	}

	@PostMapping("/{id}/toggle-status")
	public ResponseEntity<?> toggleUserStatus(@PathVariable String id, @RequestParam boolean enabled) {
		try {
			boolean isAdmin = userService.getUserById(id).map(user -> user.getRole() == Role.ADMINISTRATEUR)
					.orElse(false);

			if (isAdmin) {
				return ResponseEntity.status(HttpStatus.FORBIDDEN)
						.body("Impossible de modifier le statut d'un administrateur");
			}

			adminService.updateUserEnabledStatus(id, enabled);
			userService.getUserById(id).ifPresent(user -> {
				user.setActive(enabled);
				userService.createUser(user);
			});

			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PutMapping("/{id}/reset-password")
	public ResponseEntity<?> resetPassword(@PathVariable String id, @RequestBody Map<String, String> passwordData) {
		try {
			String newPassword = passwordData.get("newPassword");
			if (newPassword == null || newPassword.isEmpty()) {
				return ResponseEntity.badRequest().body("Le nouveau mot de passe est requis");
			}
			adminService.resetUserPassword(id, newPassword);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Erreur lors de la réinitialisation du mot de passe: " + e.getMessage());
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
			boolean isAdmin = userService.getUserById(id).map(user -> user.getRole() == Role.ADMINISTRATEUR)
					.orElse(false);

			if (isAdmin) {
				return ResponseEntity.status(HttpStatus.FORBIDDEN)
						.body("Impossible de modifier le rôle d'un administrateur");
			}

			Role userRole;
			try {
				userRole = Role.valueOf(roleName.toUpperCase().replace(" ", "_"));
			} catch (IllegalArgumentException e) {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Rôle inconnu: " + roleName);
			}

			userService.getUserById(id).ifPresent(user -> {
				user.setRole(userRole);
				userService.createUser(user);
				System.out.println("AdminController: Rôle " + userRole + " mis à jour en base pour l'ID: " + id);
			});

			try {
				List<Map<String, Object>> currentRoles = adminService.getUserRoles(id);
				List<String> businessRoles = List.of("ADMINISTRATEUR", "AUDITEUR", "MAGASINIER",
						"RESPONSABLE_LOGISTIQUE");

				if (currentRoles != null) {
					for (Map<String, Object> roleMap : currentRoles) {
						String name = (String) roleMap.get("name");
						if (businessRoles.contains(name)) {
							adminService.removeRole(id, name);
							System.out.println("AdminController: Ancien rôle Keycloak retiré: " + name);
						}
					}
				}

				String kcRole = mapToKeycloakRole(roleName);
				adminService.assignRole(id, kcRole);
				System.out
						.println("AdminController: Nouveau rôle " + kcRole + " assigné dans Keycloak pour l'ID: " + id);
			} catch (Exception e) {
				System.err.println("AdminController: Erreur lors de la synchronisation Keycloak: " + e.getMessage());
			}

			Map<String, String> response = new HashMap<>();
			response.put("message", "Rôle mis à jour avec succès");
			return ResponseEntity.ok(response);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body("Erreur lors de l'assignation: " + e.getMessage());
		}
	}

	@DeleteMapping("/{id}/roles/{roleName}")
	public ResponseEntity<?> removeRole(@PathVariable String id, @PathVariable String roleName) {
		try {
			String kcRole = mapToKeycloakRole(roleName);
			adminService.removeRole(id, kcRole);
			System.out.println("AdminController: Rôle " + kcRole + " retiré de Keycloak pour l'ID: " + id);

			userService.getUserById(id).ifPresent(user -> {
				user.setRole(Role.MAGASINIER);
				userService.createUser(user);
				System.out.println("AdminController: Rôle réinitialisé à MAGASINIER pour l'ID: " + id);
			});

			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
		}
	}

	private String mapToKeycloakRole(String roleName) {
		if (roleName == null)
			return null;
		String upper = roleName.toUpperCase().replace(" ", "_");
		switch (upper) {
			case "ADMINISTRATEUR":
				return "ADMINISTRATEUR";
			case "AUDITEUR":
				return "AUDITEUR";
			case "MAGASINIER":
				return "MAGASINIER";
			case "RESPONSABLE_LOGISTIQUE":
				return "RESPONSABLE_LOGISTIQUE";
			default:
				return upper;
		}
	}
}
