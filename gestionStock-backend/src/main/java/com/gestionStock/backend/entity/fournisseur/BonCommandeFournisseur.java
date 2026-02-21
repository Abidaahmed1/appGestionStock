package com.gestionStock.backend.entity.fournisseur;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@EqualsAndHashCode(of = "numeroCmd")
public class BonCommandeFournisseur {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)

	private Long id;
	@Column(unique = true)
	private Long numeroCmd;
	private LocalDateTime dateCmd;
	private LocalDate dateArrivee;
	
	@ManyToOne
	private User createur;
	@ManyToOne
	@NotNull(message = "Le fournisseur est obligatoire")
	private Fournisseur fournisseur;

	@Enumerated(EnumType.STRING)
	private StatutCommande statut;

	@OneToMany(mappedBy = "bonCommandeFournisseur", cascade = CascadeType.ALL, orphanRemoval = true)
	@NotEmpty(message = "La commande doit contenir au moins une ligne")
	private List<LigneCommande> lignes = new ArrayList<>();
}
