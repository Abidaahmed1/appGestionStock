package com.gestionStock.backend.entity.Stock;

import java.time.LocalDate;
import java.util.Set;

import com.gestionStock.backend.entity.fournisseur.Fournisseur;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.user.User;

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

@Entity
@Getter
@Setter
@ToString(exclude = "mouvement")
@EqualsAndHashCode(of = "numeroBon")
public class Bon {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	private LocalDate date;
	private Long numeroBon;
	@Enumerated(EnumType.STRING)
	private TypeBon typeBon;
	@OneToOne(mappedBy = "bon")

	private MouvementStock mouvement;
	@ManyToOne
	private User createur;
	@ManyToOne
	@JoinColumn(name = "fournisseur_id")
	private Fournisseur fournisseur;
}
