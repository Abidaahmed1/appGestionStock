package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.LigneInventaire;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LigneInventaireRepository extends JpaRepository<LigneInventaire, Long> {
}
