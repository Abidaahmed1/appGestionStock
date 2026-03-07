package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.Categorie;
import org.springframework.data.jpa.repository.JpaRepository;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import java.util.List;
import java.util.Optional;

public interface CategorieRepository extends JpaRepository<Categorie, Long> {
    Optional<Categorie> findByCode(String code);

    List<Categorie> findByArchiveeFalseAndEntreprise(Entreprise entreprise);

    List<Categorie> findByEntreprise(Entreprise entreprise);
}
