package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@ToString
@Getter
@Setter
@EqualsAndHashCode(of = "codeBarre")
@Entity
public class PieceDetachee {
	public PieceDetachee() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	private String codeBarre;
	private boolean archivee = false;
	private String designation;
	@Column(name = "prix_vente", nullable = false)
	private Double prixVente = 0.0;

	private String reference;
	private int seuilMinimum;
	private double tauxTVA;
	private String imageUrl;

	@JsonIgnore
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<Stock> stocks = new HashSet<>();

	@JsonIgnoreProperties("pieces")
	@ManyToMany(mappedBy = "pieces", cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	private Set<ProduitFini> produitsAssocies = new HashSet<>();
	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "categorie_id")
	private Categorie categorie;

}
