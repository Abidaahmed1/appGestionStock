package com.gestionStock.backend.repository.fournisseur;

import com.gestionStock.backend.entity.fournisseur.BonCommandeFournisseur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BonCommandeFournisseurRepository extends JpaRepository<BonCommandeFournisseur, Long> {
    Optional<BonCommandeFournisseur> findByNumeroCmd(Long numeroCmd);

    List<BonCommandeFournisseur> findByFournisseurId(Long fournisseurId);

    List<BonCommandeFournisseur> findByCreateurId(String createurId);

    List<BonCommandeFournisseur> findByCreateurEntreprise(
            com.gestionStock.backend.entity.entreprise.Entreprise entreprise);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(b.numeroCmd) FROM BonCommandeFournisseur b WHERE b.numeroCmd >= ?1 AND b.numeroCmd <= ?2")
    Long findMaxNumeroCmdBetween(Long start, Long end);
}
