package com.gestionStock.backend.entity.piece;

import jakarta.persistence.*;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Getter;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.HashSet;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@Getter
@Setter
@EqualsAndHashCode(of = "code")
@ToString
@Entity
public class Categorie {
    public Categorie() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;
    private boolean archivee = false;
    private String nom;
    private String description;
    @Column(unique = true, nullable = false)
    private String code;
    @JsonIgnore
    @OneToMany(mappedBy = "categorie")
    private Set<PieceDetachee> pieces = new HashSet<PieceDetachee>();
}
