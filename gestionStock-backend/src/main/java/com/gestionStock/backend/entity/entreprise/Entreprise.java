package com.gestionStock.backend.entity.entreprise;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank(message = "Le nom de l'entreprise est obligatoire")
    @Column(nullable = false, unique = true)
    private String nom;

    private String contact;
    private String adresse;
    
    @NotBlank(message = "Le téléphone est obligatoire")
    private String telephone;
    
    @NotBlank(message = "L'email est obligatoire")
    private String email;
    
    private String logoUrl;
    private String codePostal;
    
    @NotNull(message = "La devise est obligatoire")
    @ManyToOne
    @JoinColumn(name = "devise_id")
    private Devise devise;

    @ManyToOne
    @JoinColumn(name = "pays_id")
    private Pays pays;
}
