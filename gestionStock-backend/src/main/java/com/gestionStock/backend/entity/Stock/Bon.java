package com.gestionStock.backend.entity.Stock;

import java.time.LocalDate;

import com.gestionStock.backend.entity.fournisseur.Fournisseur;
import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import com.gestionStock.backend.entity.entreprise.Entreprise;

@Entity
@Getter
@Setter
@ToString(exclude = "mouvement")
@EqualsAndHashCode(of = "numeroBon")
public class Bon {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;
	private LocalDate date;
	@Column(unique = true, nullable = false)
	private String numeroBon;
	@Enumerated(EnumType.STRING)
	private TypeBon typeBon;
	@ManyToOne
	@JoinColumn(name = "bon_origine_id")
	private Bon bonOrigine;
	@com.fasterxml.jackson.annotation.JsonIgnoreProperties("bon")
	@OneToOne(mappedBy = "bon", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
	private MouvementStock mouvement;
	@ManyToOne
	private User createur;
	@ManyToOne
	@JoinColumn(name = "fournisseur_id")
	private Fournisseur fournisseur;

	private Boolean archived = false;
}
