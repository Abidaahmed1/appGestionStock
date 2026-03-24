package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.NotBlank;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Getter
@Setter
@EqualsAndHashCode(of = { "id", "code", "entreprise" })
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProduitFini {

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;

	@NotBlank(message = "Le code produit est obligatoire")
	@Column(nullable = false)
	private String code;

	@NotBlank(message = "La désignation est obligatoire")
	private String designation;
	@Column(nullable = false)
	@Builder.Default
	private Boolean estArchivee = false;

	private String imageUrl;

	@JsonIgnoreProperties({ "produitsAssocies", "stock", "details" })
	@ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@Builder.Default
	private Set<PieceDetachee> pieces = new HashSet<>();

	public Boolean isEstArchivee() {
		return this.estArchivee;
	}
}
