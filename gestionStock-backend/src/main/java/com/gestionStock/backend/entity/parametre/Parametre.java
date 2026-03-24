package com.gestionStock.backend.entity.parametre;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.gestionStock.backend.entity.entreprise.Entreprise;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Parametre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    private String nom;

    @Enumerated(EnumType.STRING)
    private TypeChamp type;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean obligatoire = false;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean variante = false;

    @ElementCollection
    @CollectionTable(name = "parametre_options", joinColumns = @JoinColumn(name = "parametre_id"))
    @Column(name = "option_valeur")
    @Builder.Default
    private List<String> options = new ArrayList<>();

    private String defaultValue;
    private String description;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private Integer ordre = 0;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default true")
    private Boolean actif = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private List<NumerotationConfig> numerotationConfigs = new ArrayList<>();

}