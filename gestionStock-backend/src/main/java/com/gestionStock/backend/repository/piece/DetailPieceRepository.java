package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.DetailPiece;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DetailPieceRepository extends JpaRepository<DetailPiece, Long> {
    boolean existsByCodeBarreAndPieceEntreprise(String codeBarre, Entreprise entreprise);

    Optional<DetailPiece> findByCodeBarreAndPieceEntreprise(String codeBarre, Entreprise entreprise);
}
