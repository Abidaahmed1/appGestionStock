package com.gestionStock.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionStock.backend.entity.user.User;

public interface UserRepository extends JpaRepository<User, String> {
    List<User> findByActiveTrue();
    java.util.Optional<User> findByEmail(String email);
}