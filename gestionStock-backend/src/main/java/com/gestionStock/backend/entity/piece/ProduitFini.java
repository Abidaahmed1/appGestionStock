package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@Entity
@Getter
@Setter
@EqualsAndHashCode(of = {"code", "entreprise"})
public class ProduitFini {
	public ProduitFini() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;

	@NotBlank(message = "Le code produit est obligatoire")
	@Pattern(regexp = "^PF-.*", message = "Le code du produit fini doit commencer par PF-")
	//@Column(unique = true, nullable = false)
	@Column( nullable = false)
	private String code;

	@NotBlank(message = "La désignation est obligatoire")
	private String designation;
	@Column(nullable = false)
	private boolean estArchivee = false;

	private String imageUrl;

	@JsonIgnoreProperties({ "produitsAssocies", "stock", "details" })
	@ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	private Set<PieceDetachee> pieces = new HashSet<>();
}
