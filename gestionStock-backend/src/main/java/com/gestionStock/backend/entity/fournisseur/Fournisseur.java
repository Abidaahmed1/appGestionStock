package com.gestionStock.backend.entity.fournisseur;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.gestionStock.backend.entity.Stock.Bon;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@EqualsAndHashCode(of = "code")
public class Fournisseur {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)

	private Long id;
	private boolean archivee = false;

	@NotBlank(message = "L'adresse est obligatoire")
	private String adresse;

	@NotBlank(message = "Le code fournisseur est obligatoire")
	@Size(min = 2, max = 20, message = "Le code doit contenir entre 2 et 20 caractères")
	@Pattern(regexp = "^FOUR-.*", message = "Le code fournisseur doit commencer par FOUR-")
	private String code;

	@NotBlank(message = "Le nom du fournisseur est obligatoire")
	private String nom;

	@NotBlank(message = "L'email est obligatoire")
	@Email(message = "Le format de l'email est invalide")
	private String email;

	@NotBlank(message = "Le numéro de téléphone est obligatoire")
	@Size(min = 8, max = 8, message = "Le numéro de téléphone doit contenir 8 chiffres")
	private String tel;

	@JsonIgnore
	@OneToMany(mappedBy = "fournisseur")
	private Set<Bon> Bons = new HashSet<>();

	@JsonIgnore
	@OneToMany(mappedBy = "fournisseur")
	private Set<BonCommandeFournisseur> bonCommandes = new HashSet<>();
}
