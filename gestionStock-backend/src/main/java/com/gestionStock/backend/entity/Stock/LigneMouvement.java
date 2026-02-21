package com.gestionStock.backend.entity.Stock;

import com.gestionStock.backend.entity.piece.PieceDetachee;

import jakarta.persistence.CascadeType;
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
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "stock_id", "mouvement_id" }))
@Getter
@Setter
@ToString(exclude = { "stock", "mouvementStock" })
@EqualsAndHashCode(of = { "stock", "mouvementStock" })
public class LigneMouvement {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	@ManyToOne
	@JoinColumn(name = "mouvement_id", nullable = false)
	private MouvementStock mouvementStock;

	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "stock_id", nullable = false)
	private Stock stock;
	private int quantite;
	private double prixHTVA;
	private double tauxTVA;
}
