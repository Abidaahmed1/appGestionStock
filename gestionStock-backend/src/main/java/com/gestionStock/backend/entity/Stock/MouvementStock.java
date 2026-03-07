package com.gestionStock.backend.entity.Stock;

import java.time.LocalDateTime;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@ToString(exclude = { "ligneMouvement", "bon" })
@Getter
@Setter
public class MouvementStock {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	private LocalDateTime date;
	private Double montantHTVA;
	private Double montantTTC;
	@Enumerated(EnumType.STRING)
	private TypeMouvement typeMouvement;
	@com.fasterxml.jackson.annotation.JsonManagedReference
	@OneToMany(mappedBy = "mouvementStock", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<LigneMouvement> ligneMouvement = new java.util.ArrayList<>();
	@OneToOne
	private Bon bon;

}
