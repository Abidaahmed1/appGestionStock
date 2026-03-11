package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.Unite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UniteRepository extends JpaRepository<Unite, Long> {
    Optional<Unite> findByNom(String nom);

    Optional<Unite> findByAbbreviation(String abbreviation);
}
