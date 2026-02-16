package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.Categorie;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CategorieRepository extends JpaRepository<Categorie, Long> {
    Optional<Categorie> findByCode(String code);
}
