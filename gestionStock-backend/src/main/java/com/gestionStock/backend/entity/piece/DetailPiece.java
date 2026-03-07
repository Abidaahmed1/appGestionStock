package com.gestionStock.backend.entity.piece;

import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.parametre.Parametre;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
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



    @OneToOne
    @JsonIgnoreProperties({ "detailPiece", "piece" })
    private Stock stock;

}
