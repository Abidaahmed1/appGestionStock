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

	@GetMapping("/me")
	public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
		return userService.findUserByJwt(jwt)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}

	@PutMapping("/profile")
	public ResponseEntity<?> updateProfile(@AuthenticationPrincipal Jwt jwt,
			@RequestBody Map<String, String> profileData) {
		try {
			String userId = jwt.getSubject();
			String firstName = profileData.get("firstName");
			String lastName = profileData.get("lastName");
			String email = profileData.get("email");

			keycloakAdminService.updateUserProfile(userId, firstName, lastName, email);

			userService.findUserByJwt(jwt).ifPresent(user -> {
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

	@PutMapping("/appearance")
	public ResponseEntity<?> updateAppearance(@AuthenticationPrincipal Jwt jwt,
			@RequestBody Map<String, String> appearanceData) {
		try {
			userService.findUserByJwt(jwt).ifPresent(user -> {
				user.setTheme(appearanceData.get("theme"));
				user.setAccentColor(appearanceData.get("accentColor"));
				userService.createUser(user); // Save/Update
			});
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PutMapping("/notifications")
	public ResponseEntity<?> updateNotifications(@AuthenticationPrincipal Jwt jwt,
			@RequestBody Map<String, Object> notificationData) {
		try {
			userService.findUserByJwt(jwt).ifPresent(user -> {
				user.setEmailOrders((Boolean) notificationData.get("emailOrders"));
				user.setEmailStock((Boolean) notificationData.get("emailStock"));
				user.setPushAlerts((Boolean) notificationData.get("pushAlerts"));
				userService.createUser(user); // Save/Update
			});
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}
}
