package com.gestionStock.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.*;

@ToString
@NoArgsConstructor
@Getter
@Setter
@EqualsAndHashCode(of="codeBarre")
@Entity
public class PieceDetachee {
    @Id @GeneratedValue
    private  long id;
    private  int codeBarre;
    private boolean archivee;
    private String designation;
    private double prixAchat;
    private  String reference;
    private  int seuilMinimum;
    private double tauxTVA;
}
