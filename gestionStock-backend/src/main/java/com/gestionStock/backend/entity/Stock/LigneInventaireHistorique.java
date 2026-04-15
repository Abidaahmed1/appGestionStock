package com.gestionStock.backend.entity.Stock;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.gestionStock.backend.entity.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ligne_inventaire_historique")
public class LigneInventaireHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime date;
    
    @Column(length = 500)
    private String action;
    
    @Column(length = 1000)
    private String details;

    private Integer ancienneValeur;
    private Integer nouvelleValeur;
    
    @Enumerated(EnumType.STRING)
    private LigneStatut ancienStatut;
    
    @Enumerated(EnumType.STRING)
    private LigneStatut nouveauStatut;

    @ManyToOne
    private User utilisateur;

    @ManyToOne
    @JoinColumn(name = "ligne_inventaire_id")
    @JsonBackReference
    private LigneInventaire ligneInventaire;
}
