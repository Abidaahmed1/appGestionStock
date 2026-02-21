package com.gestionStock.backend.repository.fournisseur;

import com.gestionStock.backend.entity.fournisseur.LigneCommande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LigneCommandeRepository extends JpaRepository<LigneCommande, Long> {
    List<LigneCommande> findByBonCommandeFournisseurId(Long bonCommandeId);
}
