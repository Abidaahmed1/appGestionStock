package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MouvementStockRepository extends JpaRepository<MouvementStock, Long> {
    List<MouvementStock> findByTypeMouvement(TypeMouvement typeMouvement);

    List<MouvementStock> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);

    List<MouvementStock> findByBonId(Long bonId);
}
