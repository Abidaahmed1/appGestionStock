package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gestionStock.backend.entity.Stock.Stock;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@ToString(exclude = { "stock", "produitsAssocies" })
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

	@NotBlank(message = "Le code barre est obligatoire")
	@Column(unique = true, nullable = false)
	private String codeBarre;

	private boolean archivee = false;

	@NotBlank(message = "La désignation est obligatoire")
	private String designation;

	@NotNull(message = "Le prix de vente est obligatoire")
	@Min(value = 0, message = "Le prix ne peut pas être négatif")
	@Column(name = "prix_vente", nullable = false)
	private Double prixVente = 0.0;

	@NotBlank(message = "La référence est obligatoire")
	@Pattern(regexp = "^REF-.*", message = "La référence de la pièce détachée doit commencer par REF-")
	private String reference;

	@Min(value = 0, message = "Le seuil minimum ne peut pas être négatif")
	private int seuilMinimum;

	@Min(value = 0, message = "Le seuil maximum ne peut pas être négatif")
	private int seuilMaximum;

	@Min(value = 0, message = "Le taux TVA ne peut pas être négatif")
	private double tauxTVA;
	private String imageUrl;

	@JsonIgnoreProperties("piece")
	@OneToOne(mappedBy = "piece")
	private Stock stock;
	@JsonIgnoreProperties("pieces")
	@ManyToMany(mappedBy = "pieces", cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	private Set<ProduitFini> produitsAssocies = new HashSet<>();
	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "categorie_id")
	private Categorie categorie;

}
