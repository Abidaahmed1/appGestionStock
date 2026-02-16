package com.gestionStock.backend.service.user;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.repository.user.UserRepository;

@Service
public class UserService {

	@Autowired
	private UserRepository userRepository;

	public List<User> getAllUsers() {
		return userRepository.findByActiveTrue();
	}

	public List<User> getAllUsersComplete() {
		return userRepository.findAll();
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
		return userRepository.findByEmail(email).map(user -> {
			user.setFirstName(firstName);
			user.setLastName(lastName);
			user.setRole(role);
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
	}

	public Optional<User> findByEmail(String email) {
		return userRepository.findByEmail(email);
	}

}
