package com.gestionStock.backend.repository.parametre;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.parametre.Parametre;

@Repository
public interface ParametreRepository extends JpaRepository<Parametre, Long> {

    List<Parametre> findByEntrepriseOrderByOrdreAsc(Entreprise entreprise);

    @Query("SELECT p FROM Parametre p WHERE p.entreprise.id = :entrepriseId ORDER BY p.ordre ASC")
    List<Parametre> findByEntrepriseId(@Param("entrepriseId") Long entrepriseId);

    @Query("SELECT p FROM Parametre p WHERE p.entreprise.id = :entrepriseId AND p.actif = true ORDER BY p.ordre ASC")
    List<Parametre> findByEntrepriseIdAndActifTrue(@Param("entrepriseId") Long entrepriseId);

    boolean existsByEntreprise(Entreprise entreprise);
}
