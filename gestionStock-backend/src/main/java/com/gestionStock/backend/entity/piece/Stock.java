package com.gestionStock.backend.entity.piece;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "PieceDetachee_id", "entrepot_id" }))
@Getter
@Setter
@ToString
@EqualsAndHashCode(of = { "piece", "entrepot" })
public class Stock {
	public Stock() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "PieceDetachee_id", nullable = false)
	private PieceDetachee piece;

	@ManyToOne(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
	@JoinColumn(name = "entrepot_id", nullable = false)
	private Entrepot entrepot;

	private int quantite;

	@Enumerated(EnumType.STRING)
	private TypeStock type;
}
