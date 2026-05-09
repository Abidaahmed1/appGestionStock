package com.gestionStock.backend.entity.parametre;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NumerotationConfig {
    private String module;
    private String prefix;
    private String numeroDebut;
    private String redemarrer;

    @Builder.Default
    private boolean automatique = true;

    @Builder.Default
    private boolean actif = true;
}
