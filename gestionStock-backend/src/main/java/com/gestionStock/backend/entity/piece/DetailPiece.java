package com.gestionStock.backend.entity.piece;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gestionStock.backend.entity.parametre.Parametre;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetailPiece {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference("piece_details")
    @ManyToOne
    @JoinColumn(name = "piece_id")
    private PieceDetachee piece;

    @ManyToOne
    @JoinColumn(name = "parametre_id")
    private Parametre parametre;

    private String valeur;
}
