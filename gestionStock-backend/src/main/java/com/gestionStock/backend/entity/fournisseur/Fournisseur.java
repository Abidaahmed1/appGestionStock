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
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Getter
@Setter
@EqualsAndHashCode(of = { "nom", "entreprise" })
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fournisseur {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)

	private Long id;

	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;
	@Builder.Default
	private Boolean archivee = false;

	private String adresse;
	private String pays;
	private String ville;
	private String rue;
	private String codePostal;

	@NotBlank(message = "Le code fournisseur est obligatoire")
	@Size(min = 2, max = 20, message = "Le code doit contenir entre 2 et 20 caractères")
	private String code;

	@NotBlank(message = "Le nom du fournisseur est obligatoire")
	private String nom;

	@NotBlank(message = "L'email est obligatoire")
	@Email(message = "Le format de l'email est invalide")
	private String email;

	@NotBlank(message = "Le numéro de téléphone est obligatoire")
	private String tel;

	@Builder.Default
	@JsonIgnore
	@OneToMany(mappedBy = "fournisseur")
	private Set<Bon> Bons = new HashSet<>();

	@Builder.Default
	@JsonIgnore
	@OneToMany(mappedBy = "fournisseur")
	private Set<BonCommandeFournisseur> bonCommandes = new HashSet<>();
}
