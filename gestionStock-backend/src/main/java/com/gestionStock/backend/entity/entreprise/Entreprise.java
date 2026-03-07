package com.gestionStock.backend.entity.entreprise;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Entreprise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nom;

    private String contact;
    private String adresse;
    private String telephone;
    private String email;
    private String logoUrl;
    private String codePostal;
    @ManyToOne
    @JoinColumn(name = "devise_id")
    private Devise devise;

    @ManyToOne
    @JoinColumn(name = "pays_id")
    private Pays pays;
}
