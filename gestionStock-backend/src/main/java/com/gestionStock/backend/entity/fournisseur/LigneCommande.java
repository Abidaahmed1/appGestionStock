package com.gestionStock.backend.entity.fournisseur;

import com.fasterxml.jackson.annotation.JsonIgnore;

import com.gestionStock.backend.entity.piece.DetailPiece;
import com.gestionStock.backend.entity.piece.PieceDetachee;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "piece_id", "detail_piece_id",
		"commande_id" }), name = "ligne_commande_fournisseur")
@Getter
@Setter
@ToString(exclude = "bonCommandeFournisseur")
@EqualsAndHashCode(of = { "id" })
public class LigneCommande {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	@Min(value = 0, message = "Le prix d'achat ne peut pas être négatif")
	private Double prixAchat;

	@Min(value = 1, message = "La quantité doit être au moins de 1")
	private Integer qteCmd;

	private Double taxe = 19.0;
	private Double remise = 0.0;
	@ManyToOne
	@JoinColumn(name = "piece_id", nullable = false)
	@NotNull(message = "Le produit est obligatoire")
	private PieceDetachee piece;

	@ManyToOne
	@JoinColumn(name = "detail_piece_id")
	private DetailPiece detailPiece;

	@JsonIgnore
	@ManyToOne
	@JoinColumn(name = "commande_id", nullable = false)
	private BonCommandeFournisseur bonCommandeFournisseur;
}
