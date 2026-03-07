package com.gestionStock.backend.entity.parametre;

import lombok.Getter;

@Getter
public enum TypeChamp {
    TEXT("Texte"),
    NUMBER("Nombre"),
    BOOLEAN("Oui/Non"),
    DATE("Date"),
    SELECT("Liste déroulante"),
    EMAIL("Email"),
    URL("URL"),
    TEXTAREA("Zone de texte");

    private final String label;

    TypeChamp(String label) {
        this.label = label;
    }
}
