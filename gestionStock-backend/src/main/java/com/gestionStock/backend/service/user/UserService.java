package com.gestionStock.backend.service.user;

import org.springframework.transaction.annotation.Transactional;

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
			return findUserByJwt(jwt);
		}
		System.err.println("UserService: Pas d'authentification valide (JWT) dans le contexte.");
		return Optional.empty();
	}

	public Optional<User> findUserByJwt(Jwt jwt) {
		String userId = jwt.getSubject();
		Optional<User> user = userRepository.findById(userId);

		if (user.isEmpty()) {
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
			System.err.println("UserService: Utilisateur non trouvé pour l'ID: " + userId);
		}
		return user;
	}

	public Entreprise getCurrentUserEntreprise() {
		return getCurrentUser().map(user -> {
			if (user.getEntreprise() == null) {

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
			return Collections.emptyList();
		}
		return userRepository.findByActiveTrueAndEntreprise(entreprise);
	}

	public List<User> getAllUsersComplete() {
		Entreprise entreprise = getCurrentUserEntreprise();
		if (entreprise == null) {
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

	@Transactional
	public User provisionUserIfNeeded(String id, String firstName, String lastName, String email, Role role) {
		// 1. Essayer de trouver par ID Keycloak
		Optional<User> userById = userRepository.findById(id);
		if (userById.isPresent()) {
			User user = userById.get();
			user.setFirstName(firstName);
			user.setLastName(lastName);
			if (email != null)
				user.setEmail(email);
			if (user.getRole() == null)
				user.setRole(role);

			// Si l'utilisateur existe mais n'a pas d'entreprise, on check si un ancien
			// profil
			// (avec le même email) en avait une pour la récupérer automatiquement.
			if (user.getEntreprise() == null && email != null) {
				userRepository.findByEmail(email).ifPresent(oldUser -> {
					if (!oldUser.getId().equals(id) && oldUser.getEntreprise() != null) {
						System.out.println("UserService: Récupération de l'entreprise " +
								oldUser.getEntreprise().getNom() + " depuis l'ancien profil " + oldUser.getId());
						user.setEntreprise(oldUser.getEntreprise());
						oldUser.setActive(false);
						userRepository.save(oldUser);
					}
				});
			}
			return userRepository.save(user);
		}

		// 2. Si non trouvé par ID, essayer par Email pour éviter les doublons
		if (email != null) {
			Optional<User> userByEmail = userRepository.findByEmail(email);
			if (userByEmail.isPresent()) {
				User existingUser = userByEmail.get();
				System.out.println("UserService: Mismatch d'ID pour " + email + ". Liaison de l'ancien ID " +
						existingUser.getId() + " vers le nouvel ID " + id);

				// Important: Dans une vraie appli, on pourrait vouloir migrer l'ID,
				// mais ici on va simplement s'assurer que le nouvel ID herite des données.
				// Créons un nouvel objet avec le nouvel ID mais les anciennes données
				// (entreprise, etc.)
				User newUser = new User();
				newUser.setId(id);
				newUser.setFirstName(firstName);
				newUser.setLastName(lastName);
				newUser.setEmail(email);
				newUser.setRole(existingUser.getRole() != null ? existingUser.getRole() : role);
				newUser.setEntreprise(existingUser.getEntreprise());
				newUser.setActive(true);
				newUser.setTheme(existingUser.getTheme());
				newUser.setAccentColor(existingUser.getAccentColor());

				// On désactive l'ancien pour ne plus avoir de confusion
				existingUser.setActive(false);
				userRepository.save(existingUser);

				return userRepository.save(newUser);
			}
		}

		// 3. Nouveau compte pur
		User newUser = new User();
		newUser.setId(id);
		newUser.setFirstName(firstName);
		newUser.setLastName(lastName);
		newUser.setEmail(email);
		newUser.setRole(role);
		newUser.setActive(true);
		return userRepository.save(newUser);
	}

	public Optional<User> findByEmail(String email) {
		return userRepository.findByEmail(email);
	}

}
