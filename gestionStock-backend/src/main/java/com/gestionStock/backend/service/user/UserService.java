package com.gestionStock.backend.service.user;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.repository.user.UserRepository;

@Service
public class UserService {

	@Autowired
	private UserRepository userRepository;

	public Optional<User> getCurrentUser() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
			String userId = jwt.getSubject();
			Optional<User> user = userRepository.findById(userId);

			if (user.isEmpty()) {
				// Fallback: essayer de retrouver l'utilisateur par email si l'ID (sub) a changé
				String email = jwt.getClaimAsString("email");
				if (email != null) {
					user = userRepository.findByEmail(email);
					if (user.isPresent()) {
						System.out.println(
								"UserService: Utilisateur trouvé par email malgré un ID différent. ID JWT = "
										+ userId + ", ID DB = " + user.get().getId());
					}
				}
			}

			if (user.isEmpty()) {
				System.err
						.println("UserService: Utilisateur non trouvé pour l'ID (sub): " + userId + " et aucun email.");
				return Optional.empty();
			}

			System.out.println("UserService: Utilisateur trouvé: " + user.get().getEmail() + " (Entreprise: "
					+ (user.get().getEntreprise() != null ? user.get().getEntreprise().getNom() : "AUCUNE") + ")");
			return user;
		}
		System.err.println("UserService: Pas d'authentification valide (JWT) dans le contexte.");
		return Optional.empty();
	}

	public Entreprise getCurrentUserEntreprise() {
		return getCurrentUser().map(user -> {
			if (user.getEntreprise() == null) {
				// Ne plus attribuer automatiquement une entreprise par défaut.
				// L'attribut entreprise_id de l'utilisateur doit rester null tant que
				// l'administrateur n'a pas explicitement défini une entreprise.
				System.err.println("UserService: Utilisateur " + user.getId()
						+ " n'a pas d'entreprise assignée. Aucune entreprise par défaut ne sera appliquée.");
				return null;
			} else {
				System.out.println("UserService: Entreprise de l'utilisateur: " + user.getEntreprise().getNom());
				return user.getEntreprise();
			}
		}).orElse(null);
	}

	public List<User> getAllUsers() {
		Entreprise entreprise = getCurrentUserEntreprise();
		if (entreprise == null) {
			// Aucun utilisateur ne doit être retourné si l'utilisateur courant
			// n'est rattaché à aucune entreprise.
			return Collections.emptyList();
		}
		return userRepository.findByActiveTrueAndEntreprise(entreprise);
	}

	public List<User> getAllUsersComplete() {
		Entreprise entreprise = getCurrentUserEntreprise();
		if (entreprise == null) {
			// Idem: on ne retourne pas les utilisateurs dont entreprise_id est null.
			return Collections.emptyList();
		}
		return userRepository.findAllByEntreprise(entreprise);
	}

	public Optional<User> getUserById(String id) {
		return userRepository.findById(id);
	}

	public User createUser(User user) {
		return userRepository.save(user);
	}

	public Optional<User> updateUser(String id, User updated) {
		return userRepository.findById(id).map(existing -> {
			updated.setId(id);
			return userRepository.save(updated);
		});
	}

	public void deleteUser(String id) {
		userRepository.findById(id).ifPresent(user -> {
			user.setActive(false);
			userRepository.save(user);
		});
	}

	public User provisionUserIfNeeded(String id, String firstName, String lastName, String email, Role role) {
		return userRepository.findById(id).map(user -> {
			user.setFirstName(firstName);
			user.setLastName(lastName);
			user.setEmail(email);
			if (user.getRole() == null) {
				user.setRole(role);
			}
			return userRepository.save(user);
		}).orElseGet(() -> {
			return userRepository.findByEmail(email).map(user -> {
				if (!user.getId().equals(id)) {
					System.out.println("UserService: Mismatch d'ID détecté pour " + email + ". Ancien: " + user.getId()
							+ ", Nouveau (JWT): " + id + ". Conservation de l'utilisateur existant sans suppression.");

				}
				user.setFirstName(firstName);
				user.setLastName(lastName);
				if (user.getRole() == null) {
					user.setRole(role);
				}
				return userRepository.save(user);
			}).orElseGet(() -> {
				User user = new User();
				user.setId(id);
				user.setFirstName(firstName);
				user.setLastName(lastName);
				user.setEmail(email);
				user.setRole(role);
				user.setActive(true);
				return userRepository.save(user);
			});
		});
	}

	public Optional<User> findByEmail(String email) {
		return userRepository.findByEmail(email);
	}

}
