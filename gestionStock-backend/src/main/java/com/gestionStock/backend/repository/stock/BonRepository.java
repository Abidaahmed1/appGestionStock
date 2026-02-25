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
    Optional<Bon> findByNumeroBon(String numeroBon);

    List<Bon> findByTypeBon(TypeBon typeBon);

    List<Bon> findByDateBetween(LocalDate startDate, LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT b.numeroBon FROM Bon b WHERE b.numeroBon LIKE :prefix% ORDER BY b.numeroBon DESC")
    java.util.List<String> findNumeroBonByPrefix(
            @org.springframework.web.bind.annotation.RequestParam("prefix") String prefix);

    boolean existsByNumeroBon(String numeroBon);

    java.util.List<Bon> findByBonOrigineId(Long bonOrigineId);
}
