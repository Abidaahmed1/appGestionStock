package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {
    List<Stock> findByPieceEntreprise(Entreprise entreprise);

    List<Stock> findByTypeAndPieceEntreprise(TypeStock type, Entreprise entreprise);

    @Query("SELECT s FROM Stock s WHERE s.quantite < s.piece.seuilMinimum AND s.piece.entreprise = :entreprise")
    List<Stock> findLowStockItemsByEntreprise(Entreprise entreprise);

    List<Stock> findByPieceId(Long pieceId);

    Optional<Stock> findByDetailPieceId(Long detailId);

    List<Stock> findByType(TypeStock type);

    boolean existsByPieceIdAndQuantiteGreaterThan(Long pieceId, int quantity);

    @Query("SELECT s FROM Stock s WHERE s.quantite < s.piece.seuilMinimum")
    List<Stock> findLowStockItems();
}
