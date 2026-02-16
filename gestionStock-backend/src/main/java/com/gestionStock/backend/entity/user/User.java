package com.gestionStock.backend.entity.user;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {
	@Id
	private String id;
	private String firstName;
	private String lastName;
	private String email;
	private boolean active = true;
	@Enumerated(value = EnumType.STRING)
	private Role role;
}