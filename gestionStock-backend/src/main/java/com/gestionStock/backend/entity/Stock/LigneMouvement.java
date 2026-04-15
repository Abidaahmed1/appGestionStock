package com.gestionStock.backend.entity.Stock;

import jakarta.persistence.*;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Getter
@Setter
@ToString(exclude = { "piece", "mouvementStock" })
@EqualsAndHashCode(of = { "id" })
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LigneMouvement {
	@Id
	@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ligne_mvt_seq")
	@SequenceGenerator(name = "ligne_mvt_seq", sequenceName = "ligne_mvt_id_seq", allocationSize = 1, initialValue = 1000000)
	private Long id;
	@com.fasterxml.jackson.annotation.JsonBackReference("mvt_ligne")
	@ManyToOne
	@JoinColumn(name = "mouvement_id", nullable = false)
	private MouvementStock mouvementStock;

	@JsonIgnoreProperties({ "historiques", "produitsAssocies", "details" })
	@ManyToOne
	@JoinColumn(name = "piece_id", nullable = true)
	private PieceDetachee piece;

	private Integer quantite;
	private Double prixHTVA;
	private Double tauxTVA;
}
