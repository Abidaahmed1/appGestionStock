package com.gestionStock.backend.entity.Stock;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.gestionStock.backend.entity.piece.PieceDetachee;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "PieceDetachee_id" }))
@Getter
@Setter
@ToString(exclude = { "ligneMouvement", "piece" })
@EqualsAndHashCode(of = { "piece" })
public class Stock {
	public Stock() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@OneToOne
	@JoinColumn(name = "PieceDetachee_id", nullable = false)
	private PieceDetachee piece;

	private int quantite;

	@Enumerated(EnumType.STRING)
	private TypeStock type;
	@JsonIgnore
	@OneToMany(mappedBy = "stock", cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<LigneMouvement> ligneMouvement = new HashSet<>();

}
