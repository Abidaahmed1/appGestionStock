package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.Bon;
import com.gestionStock.backend.entity.Stock.TypeBon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BonRepository extends JpaRepository<Bon, Long> {
    Optional<Bon> findByNumeroBon(Long numeroBon);

    List<Bon> findByTypeBon(TypeBon typeBon);

    List<Bon> findByDateBetween(LocalDate startDate, LocalDate endDate);

    List<Bon> findByCreateurId(Long createurId);

    boolean existsByNumeroBon(Long numeroBon);
}
