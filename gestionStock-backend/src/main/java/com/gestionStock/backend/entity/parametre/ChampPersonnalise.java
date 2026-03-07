package com.gestionStock.backend.entity.parametre;

import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChampPersonnalise {
    private String nom;
    private TypeChamp type;
    @Builder.Default
    private boolean obligatoire = false;
    @Builder.Default
    private boolean variante = false;
    @Builder.Default
    private List<String> options = new ArrayList<>();
    private String defaultValue;
    private String description;
    @Builder.Default
    private int ordre = 0;
    @Builder.Default
    private boolean actif = true;
}
