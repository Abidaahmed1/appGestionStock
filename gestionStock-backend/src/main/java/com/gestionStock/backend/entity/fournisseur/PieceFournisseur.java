package com.gestionStock.backend.entity.fournisseur;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.gestionStock.backend.entity.piece.PieceDetachee;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "id_piece",
		"id_fournisseur" }), name = "fournisseur_pieces")
@Getter
@Setter
@ToString
@EqualsAndHashCode(of = { "piece", "fournisseur" })
public class PieceFournisseur {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	private Double prixAchat;
	private Integer qteMinACommander;
	private Double tauxRemise;
	private Boolean estPrincipale;
	private LocalDateTime dateDebutValidite;
	private LocalDateTime dateFinValidite;
	@ManyToOne
	@JoinColumn(name = "id_piece", nullable = false)
	private PieceDetachee piece;
	@ManyToOne
	@JoinColumn(name = "id_fournisseur", nullable = false)
	private Fournisseur fournisseur;

}
