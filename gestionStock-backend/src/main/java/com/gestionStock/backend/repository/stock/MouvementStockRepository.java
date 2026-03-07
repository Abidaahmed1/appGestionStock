package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@Repository
public interface MouvementStockRepository extends JpaRepository<MouvementStock, Long> {
    List<MouvementStock> findByBonEntreprise(Entreprise entreprise);

    List<MouvementStock> findByTypeMouvementAndBonEntreprise(TypeMouvement typeMouvement, Entreprise entreprise);

    List<MouvementStock> findByDateBetweenAndBonEntreprise(LocalDateTime startDate, LocalDateTime endDate,
            Entreprise entreprise);

    List<MouvementStock> findByTypeMouvement(TypeMouvement typeMouvement);

    List<MouvementStock> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);

    List<MouvementStock> findByBonId(Long bonId);
}
