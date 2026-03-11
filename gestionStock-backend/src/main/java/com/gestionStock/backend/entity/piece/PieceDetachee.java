package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gestionStock.backend.entity.Stock.Stock;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;
import com.gestionStock.backend.entity.entreprise.Entreprise;

@ToString(exclude = { "stocks", "produitsAssocies", "details" })
@Getter
@Setter
@EqualsAndHashCode(of = { "reference", "entreprise" })
@Entity
public class PieceDetachee {
	public PieceDetachee() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;

	private boolean archivee = false;

	@NotBlank(message = "La référence est obligatoire")
	private String reference;

	@NotBlank(message = "La désignation est obligatoire")
	private String designation;

	@Min(value = 0, message = "Le seuil minimum ne peut pas être négatif")
	private int seuilMinimum;

	@Min(value = 0, message = "Le seuil maximum ne peut pas être négatif")
	private int seuilMaximum;

	private String imageUrl;

	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "unite_id")
	private Unite unite;

	@JsonIgnoreProperties("piece")
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<Stock> stocks = new HashSet<>();
	@JsonIgnoreProperties("pieces")
	@ManyToMany(mappedBy = "pieces", cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	private Set<ProduitFini> produitsAssocies = new HashSet<>();
	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "categorie_id")
	private Categorie categorie;

	@JsonIgnoreProperties("piece")
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<DetailPiece> details = new HashSet<>();
}
