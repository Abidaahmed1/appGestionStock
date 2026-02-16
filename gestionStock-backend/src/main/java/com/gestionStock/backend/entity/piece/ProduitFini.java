package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Getter
@Setter
public class ProduitFini {
	public ProduitFini() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@Column(unique = true, nullable = false)
	private String code;

	private String designation;
	@Column(nullable = false)
	private boolean estArchivee = false;

	private String imageUrl;

	@JsonIgnoreProperties("produitsAssocies")
	@ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	private Set<PieceDetachee> pieces = new HashSet<>();
}
