package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.Bon;
import com.gestionStock.backend.entity.Stock.TypeBon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@Repository
public interface BonRepository extends JpaRepository<Bon, Long> {
        java.util.Optional<Bon> findByNumeroBon(String numeroBon);

        List<Bon> findByArchivedFalse();

        List<Bon> findByArchivedFalseAndEntreprise(Entreprise entreprise);

        List<Bon> findByArchivedTrueAndEntreprise(Entreprise entreprise);

        List<Bon> findByCreateurIdAndArchivedFalseAndEntreprise(String createurId, Entreprise entreprise);

        List<Bon> findByCreateurIdAndArchivedTrueAndEntreprise(String createurId, Entreprise entreprise);

        List<Bon> findByTypeBonAndArchivedFalseAndEntreprise(TypeBon typeBon, Entreprise entreprise);

        List<Bon> findByTypeBonAndCreateurIdAndArchivedFalseAndEntreprise(TypeBon typeBon, String createurId,
                        Entreprise entreprise);

        List<Bon> findByDateBetweenAndArchivedFalseAndEntreprise(LocalDate startDate, LocalDate endDate,
                        Entreprise entreprise);

        List<Bon> findByDateBetweenAndCreateurIdAndArchivedFalseAndEntreprise(LocalDate startDate, LocalDate endDate,
                        String createurId, Entreprise entreprise);

        List<Bon> findByArchivedTrue();

        List<Bon> findByCreateurIdAndArchivedFalse(String createurId);

        List<Bon> findByCreateurIdAndArchivedTrue(String createurId);

        List<Bon> findByTypeBonAndArchivedFalse(TypeBon typeBon);

        List<Bon> findByTypeBonAndCreateurIdAndArchivedFalse(TypeBon typeBon, String createurId);

        List<Bon> findByDateBetweenAndArchivedFalse(LocalDate startDate, LocalDate endDate);

        List<Bon> findByDateBetweenAndCreateurIdAndArchivedFalse(LocalDate startDate, LocalDate endDate,
                        String createurId);

        @org.springframework.data.jpa.repository.Query("SELECT b.numeroBon FROM Bon b WHERE b.numeroBon LIKE :prefix% ORDER BY b.numeroBon DESC")
        java.util.List<String> findNumeroBonByPrefix(
                        @org.springframework.data.repository.query.Param("prefix") String prefix);

        @org.springframework.data.jpa.repository.Query("SELECT b.numeroBon FROM Bon b WHERE b.numeroBon LIKE :prefix% AND b.entreprise = :entreprise ORDER BY b.numeroBon DESC")
        java.util.List<String> findNumeroBonByPrefixAndEntreprise(
                        @org.springframework.data.repository.query.Param("prefix") String prefix,
                        @org.springframework.data.repository.query.Param("entreprise") Entreprise entreprise);

        boolean existsByNumeroBon(String numeroBon);

        boolean existsByNumeroBonAndEntreprise(String numeroBon, Entreprise entreprise);

        java.util.List<Bon> findByBonOrigineId(Long bonOrigineId);
}
