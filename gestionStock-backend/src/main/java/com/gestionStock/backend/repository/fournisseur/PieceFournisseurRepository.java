package com.gestionStock.backend.repository.fournisseur;

import com.gestionStock.backend.entity.fournisseur.PieceFournisseur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PieceFournisseurRepository extends JpaRepository<PieceFournisseur, Long> {
    List<PieceFournisseur> findByFournisseurId(Long fournisseurId);

    List<PieceFournisseur> findByPieceIdIn(List<Long> pieceIds);

    Optional<PieceFournisseur> findByPieceIdAndFournisseurId(Long pieceId, Long fournisseurId);

    void deleteByPiece(com.gestionStock.backend.entity.piece.PieceDetachee piece);
}
