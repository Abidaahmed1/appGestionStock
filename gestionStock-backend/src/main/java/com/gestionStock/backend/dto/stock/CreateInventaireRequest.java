package com.gestionStock.backend.dto.stock;

import com.gestionStock.backend.entity.Stock.TypeInventaire;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateInventaireRequest {
    private String nom;
    private LocalDateTime date;
    private TypeInventaire type;
    private List<LigneAffectation> affectations;

    @Data
    public static class LigneAffectation {
        private Long pieceId;
        private String responsableId;
    }
}
