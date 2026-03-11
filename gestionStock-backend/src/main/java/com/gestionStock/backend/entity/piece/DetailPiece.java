package com.gestionStock.backend.entity.piece;

import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.gestionStock.backend.entity.Stock.Stock;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetailPiece {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> attributs = new HashMap<>();

    @ManyToOne
    @JoinColumn(name = "piece_id")
    @JsonIgnoreProperties({ "details", "stock", "produitsAssocies" })
    private PieceDetachee piece;

    private String codeBarre;

    @Min(value = 0, message = "Le prix ne peut pas être négatif")
    private Double prixVente = 0.0;
    @Min(value = 0, message = "Le taux TVA ne peut pas être négatif")
    private Double tauxTVA = 0.0;

    @OneToOne
    @JsonIgnoreProperties({ "detailPiece", "piece" })
    private Stock stock;

}
