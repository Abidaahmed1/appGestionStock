package com.gestionStock.backend.controller.user;

import com.gestionStock.backend.service.user.KeycloakAdminService;
import com.gestionStock.backend.service.user.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

	private final KeycloakAdminService keycloakAdminService;
	private final UserService userService;

	public UserController(KeycloakAdminService keycloakAdminService, UserService userService) {
		this.keycloakAdminService = keycloakAdminService;
		this.userService = userService;
	}

	@PutMapping("/profile")
	public ResponseEntity<?> updateProfile(@AuthenticationPrincipal Jwt jwt,
			@RequestBody Map<String, String> profileData) {
		try {
			String userId = jwt.getSubject();
			String firstName = profileData.get("firstName");
			String lastName = profileData.get("lastName");
			String email = profileData.get("email");

			// Update in Keycloak
			keycloakAdminService.updateUserProfile(userId, firstName, lastName, email);

			// Sync with local DB
			userService.getUserById(userId).ifPresent(user -> {
				user.setFirstName(firstName);
				user.setLastName(lastName);
				user.setEmail(email);
				userService.createUser(user);
			});

			return ResponseEntity.ok().build();
		} catch (Exception e) {
			String errorMsg = e.getMessage();
			if (errorMsg != null && (errorMsg.contains("409") || errorMsg.contains("Conflict"))) {
				return ResponseEntity.status(HttpStatus.CONFLICT)
						.body("Cet email est déjà utilisé par un autre compte.");
			}
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Error updating profile: " + e.getMessage());
		}
	}

	@PutMapping("/password")
	public ResponseEntity<?> updatePassword(@AuthenticationPrincipal Jwt jwt,
			@RequestBody Map<String, String> passwordData) {
		try {
			String userId = jwt.getSubject();
			String newPassword = passwordData.get("newPassword");

			keycloakAdminService.resetUserPassword(userId, newPassword);

			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Error updating password: " + e.getMessage());
		}
	}
}
