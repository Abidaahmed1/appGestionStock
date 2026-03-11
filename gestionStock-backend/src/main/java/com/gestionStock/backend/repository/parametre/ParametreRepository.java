package com.gestionStock.backend.repository.parametre;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.parametre.Parametre;

@Repository
public interface ParametreRepository extends JpaRepository<Parametre, Long> {

    Optional<Parametre> findByEntreprise(Entreprise entreprise);

    @Query("SELECT p FROM Parametre p WHERE p.entreprise.id = :entrepriseId")
    Optional<Parametre> findByEntrepriseId(@Param("entrepriseId") Long entrepriseId);

    boolean existsByEntreprise(Entreprise entreprise);
}