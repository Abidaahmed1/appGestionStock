package com.gestionStock.backend.repository.fournisseur;

import com.gestionStock.backend.entity.fournisseur.BonCommandeFournisseur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BonCommandeFournisseurRepository extends JpaRepository<BonCommandeFournisseur, Long> {
        Optional<BonCommandeFournisseur> findByNumeroCmd(String numeroCmd);

        List<BonCommandeFournisseur> findByFournisseurId(Long fournisseurId);

        List<BonCommandeFournisseur> findByCreateurId(String createurId);

        List<BonCommandeFournisseur> findByCreateurEntreprise(
                        com.gestionStock.backend.entity.entreprise.Entreprise entreprise);

        List<BonCommandeFournisseur> findByEntreprise(
                        com.gestionStock.backend.entity.entreprise.Entreprise entreprise);

        List<BonCommandeFournisseur> findByArchiveeFalseAndEntreprise(
                        com.gestionStock.backend.entity.entreprise.Entreprise entreprise);

        List<BonCommandeFournisseur> findByArchiveeTrueAndEntreprise(
                        com.gestionStock.backend.entity.entreprise.Entreprise entreprise);
}
