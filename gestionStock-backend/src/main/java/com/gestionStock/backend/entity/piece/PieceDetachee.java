package com.gestionStock.backend.entity.piece;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.*;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@Table(indexes = {
		@Index(name = "idx_piece_entreprise_designation", columnList = "entreprise_id, designation"),
		@Index(name = "idx_piece_reference", columnList = "reference")
})
@Entity
public class PieceDetachee {

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@JsonIgnore
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

	@NotNull(message = "L'unité est obligatoire")
	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "unite_id")
	private Unite unite;

	@Builder.Default
	@Min(value = 0, message = "La quantité ne peut pas être négative")
	private Integer quantite = 0;

	@NotBlank(message = "Le code barre est obligatoire")
	private String codeBarre;

	@Builder.Default
	@Min(value = 0, message = "Le prix ne peut pas être négatif")
	private Double prixVente = 0.0;

	@Builder.Default
	@Min(value = 0, message = "Le taux TVA ne peut pas être négatif")
	private Double tauxTVA = 0.0;

	@JsonIgnoreProperties("pieces")
	@ManyToMany(mappedBy = "pieces", fetch = FetchType.LAZY, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@Builder.Default
	private Set<ProduitFini> produitsAssocies = new HashSet<>();

	@NotNull(message = "La catégorie est obligatoire")
	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "categorie_id")
	private Categorie categorie;

	@Column(columnDefinition = "TEXT")
	private String description;

	// @JsonManagedReference("piece_details")
	@JsonIgnore
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	@Builder.Default
	private List<DetailPiece> details = new ArrayList<>();

	@JsonIgnoreProperties("piece")
	@OneToMany(mappedBy = "piece", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("date DESC")
	@Builder.Default
	private List<PieceHistorique> historiques = new java.util.ArrayList<>();

	@JsonIgnore
	@Transient
	@Builder.Default
	private List<PieceDetachee> variations = new ArrayList<>();

	public Boolean isArchivee() {
		return this.archivee;
	}

	@JsonProperty("details")
	public List<DetailPiece> getDetails() {
		if (this.details == null)
			return new ArrayList<>();
		return this.details.stream()
				.filter(d -> d.getParametre() != null && Boolean.TRUE.equals(d.getParametre().getActif()))
				.collect(Collectors.toList());
	}

	@JsonIgnore
	public List<DetailPiece> getRawDetails() {
		if (this.details == null)
			this.details = new ArrayList<>();
		return this.details;
	}

}
