package com.gestionStock.backend.entity.Stock;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.*;
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

    @ManyToMany
    @JoinTable(
        name = "inventaire_responsables",
        joinColumns = @JoinColumn(name = "inventaire_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> responsables = new ArrayList<>();

    private boolean estValide;
    private boolean estTermine;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @ManyToOne
    private User createur;

    @ManyToOne
    private User auditeur; // Auditeur responsable du traitement

    @OneToMany(mappedBy = "inventaire", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<LigneInventaire> lignes = new ArrayList<>();

    // New timing fields added by user
    private LocalDateTime heureDebutEffective;
    private LocalDateTime heureFinEffective;

    public User getAuditeur() {
        return auditeur;
    }

    public void setAuditeur(User auditeur) {
        this.auditeur = auditeur;
    }
}
