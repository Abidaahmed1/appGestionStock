package com.gestionStock.backend.repository.fournisseur;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestionStock.backend.entity.fournisseur.Fournisseur;

import java.util.List;
import java.util.Optional;

import com.gestionStock.backend.entity.entreprise.Entreprise;

@Repository
public interface FournisseurRepository extends JpaRepository<Fournisseur, Long> {
    Optional<Fournisseur> findByCode(String code);

    List<Fournisseur> findByArchiveeFalse();

    List<Fournisseur> findByArchiveeFalseAndEntreprise(Entreprise entreprise);
    List<Fournisseur> findByArchiveeTrueAndEntreprise(Entreprise entreprise);
    List<Fournisseur> findByEntreprise(Entreprise entreprise);

    boolean existsByCode(String code);

    boolean existsByEmail(String email);
}
