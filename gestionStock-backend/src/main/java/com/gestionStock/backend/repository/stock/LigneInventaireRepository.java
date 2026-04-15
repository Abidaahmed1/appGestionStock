package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.LigneInventaire;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LigneInventaireRepository extends JpaRepository<LigneInventaire, Long> {
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = "UPDATE inventaire_details SET stock_physique = :stock, ecart = :ecart, statut_ligne = :statut, est_valide = true WHERE id = :id", nativeQuery = true)
    void updateLigneStockNative(@Param("id") Long id, @Param("stock") Integer stock, @Param("ecart") Integer ecart, @Param("statut") String statut);
}
