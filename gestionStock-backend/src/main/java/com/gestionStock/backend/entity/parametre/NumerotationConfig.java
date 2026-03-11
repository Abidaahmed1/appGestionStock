package com.gestionStock.backend.entity.parametre;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NumerotationConfig {
    private String module; // e.g., "PIECE", "PRODUIT", "CATEGORIE", "BON_COMMANDE", "FACTURE", etc.
    private String prefix; // e.g., "CN-%DD%%FYS_YY%", "PO-", "INV-"
    private String numeroDebut; // e.g., "00001" (determines length and start value)
    private String redemarrer; // "AUCUN", "ANNUEL", "MENSUEL"
    
    @Builder.Default
    private boolean automatique = true;

    @Builder.Default
    private boolean actif = true;
}
