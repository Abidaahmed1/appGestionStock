package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    List<Stock> findByPieceId(Long pieceId);

    Optional<Stock> findByDetailPieceId(Long detailId);

    List<Stock> findByType(TypeStock type);

    @Query("SELECT s FROM Stock s WHERE s.quantite < s.piece.seuilMinimum")
    List<Stock> findLowStockItems();
}
