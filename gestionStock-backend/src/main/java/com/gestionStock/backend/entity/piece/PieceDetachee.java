package com.gestionStock.backend.entity.piece;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@JsonIgnoreProperties(ignoreUnknown = true)
@ToString(exclude = { "produitsAssocies" })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = { "id", "reference", "entreprise" })
@Entity
public class PieceDetachee {

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;

	@Builder.Default
	private Boolean archivee = false;

	@NotBlank(message = "La référence est obligatoire")
	private String reference;

	@NotBlank(message = "La désignation est obligatoire")
	private String designation;

	@Min(value = 0, message = "Le seuil minimum ne peut pas être négatif")
	private Integer seuilMinimum;

	@Min(value = 0, message = "Le seuil maximum ne peut pas être négatif")
	private Integer seuilMaximum;

	@Column(columnDefinition = "TEXT")
	private String imageUrl;

	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "unite_id")
	private Unite unite;

	@Builder.Default
	@Min(value = 0, message = "La quantité ne peut pas être négative")
	private Integer quantite = 0;

	private String codeBarre;

	@Builder.Default
	@Min(value = 0, message = "Le prix ne peut pas être négatif")
	private Double prixVente = 0.0;

	@Builder.Default
	@Min(value = 0, message = "Le taux TVA ne peut pas être négatif")
	private Double tauxTVA = 0.0;

	@JsonIgnoreProperties("pieces")
	@ManyToMany(mappedBy = "pieces", fetch = FetchType.EAGER, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@Builder.Default
	private Set<ProduitFini> produitsAssocies = new HashSet<>();
	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "categorie_id")
	private Categorie categorie;

	@Column(columnDefinition = "TEXT")
	private String description;

	@JsonManagedReference("piece_details")
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<DetailPiece> details = new ArrayList<>();

	@JsonManagedReference("piece_historiques")
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("date DESC")
	@Builder.Default
	private List<PieceHistorique> historiques = new java.util.ArrayList<>();

	@Transient
	@Builder.Default
	private List<PieceDetachee> variations = new ArrayList<>();

	public Boolean isArchivee() {
		return this.archivee;
	}
}
