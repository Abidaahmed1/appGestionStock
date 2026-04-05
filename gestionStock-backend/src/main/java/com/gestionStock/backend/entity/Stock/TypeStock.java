package com.gestionStock.backend.entity.Stock;

import lombok.Getter;

@Getter
public enum TypeStock {
    DISPONIBLE("Disponible"),
    RESERVE("En Réserve"),
    EN_REAPPROVISIONNEMENT("En réapprovisionnement"),
    DEFECTUEUX("Défectueux");

    private final String label;

    TypeStock(String label) {
        this.label = label;
    }
}
