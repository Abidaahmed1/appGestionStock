package com.gestionStock.backend.entity.piece;

import jakarta.persistence.*;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.HashSet;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
@Setter
@EqualsAndHashCode(of = "code")
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class Categorie {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;
    @Builder.Default
    @Column(nullable = false)
    private Boolean archivee = false;
    private String nom;
    private String description;
    @Column(unique = true, nullable = false)
    private String code;
    @JsonIgnore
    @OneToMany(mappedBy = "categorie")
    @Builder.Default
    private Set<PieceDetachee> pieces = new HashSet<PieceDetachee>();

    public Boolean isArchivee() {
        return this.archivee;
    }
}
