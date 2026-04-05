package com.gestionStock.backend.entity.Stock;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Builder
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@jakarta.persistence.Table(name = "inventaires")
public class Inventaire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false, updatable = false)
    private Long id;

    private LocalDateTime date;
    private String nom;

    @Enumerated(EnumType.STRING)
    private TypeInventaire type;

    private String motifRefus;

    @Builder.Default
    @jakarta.persistence.ManyToMany
    private List<User> responsables = new ArrayList<>();

    private boolean estValide;
    private boolean estTermine;

    @ManyToOne
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @ManyToOne
    private User createur;

    @OneToMany(mappedBy = "inventaire", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<LigneInventaire> lignes = new ArrayList<>();

    // New timing fields added by user
    private LocalDateTime heureDebutEffective;
    private LocalDateTime heureFinEffective;
}
