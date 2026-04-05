package com.gestionStock.backend.repository.user;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.entity.user.User;

import com.gestionStock.backend.entity.entreprise.Entreprise;

public interface UserRepository extends JpaRepository<User, String> {
	List<User> findByActiveTrue();

	List<User> findByActiveTrueAndEntreprise(Entreprise entreprise);

	List<User> findAllByEntreprise(Entreprise entreprise);

	java.util.Optional<User> findByEmail(String email);

	List<User> findByRoleIn(List<Role> roles);

	List<User> findByRoleInAndEntreprise(List<Role> roles, Entreprise entreprise);
}
