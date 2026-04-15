package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.LigneInventaireHistorique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LigneInventaireHistoriqueRepository extends JpaRepository<LigneInventaireHistorique, Long> {
}
