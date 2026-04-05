package com.gestionStock.backend.entity.parametre;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(uniqueConstraints = {
    @UniqueConstraint(columnNames = {"entreprise_id", "documentType"})
})
public class DocumentDisplaySetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType documentType;

    @Builder.Default
    private String primaryColor = "#0D9488"; 

    @Builder.Default
    private String secondaryColor = "#1e293b";

    @Builder.Default
    private Boolean showLogo = true;

    @Builder.Default
    private Boolean showSignatureMagasinier = true;

    @Builder.Default
    private Boolean showSignatureClient = true;

    @Builder.Default
    private String footerText = "Merci d'utiliser nos services.";

    @Builder.Default
    private String layout = "MODERN"; 

    @Builder.Default
    private String fontSize = "MEDIUM"; 

    @Builder.Default
    private Boolean showPriceHT = true;

    @Builder.Default
    private Boolean showTVA = true;

    @Builder.Default
    private Boolean showDiscount = true;

    @ElementCollection
    @CollectionTable(name = "document_visible_variantes", joinColumns = @JoinColumn(name = "setting_id"))
    @Column(name = "parametre_id")
    @Builder.Default
    private List<Long> visibleVarianteIds = new ArrayList<>();
}
