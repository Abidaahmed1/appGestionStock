package com.gestionStock.backend.entity.fournisseur;

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
	private String adresse;
	private String code;
	private String nom;
	private String email;
	private String tel;

	@JsonIgnore
	@OneToMany(mappedBy = "fournisseur")
	private Set<Bon> Bons = new HashSet<>();

	@JsonIgnore
	@OneToMany(mappedBy = "fournisseur")
	private Set<BonCommandeFournisseur> bonCommandes = new HashSet<>();
}
