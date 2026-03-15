package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.PieceHistorique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PieceHistoriqueRepository extends JpaRepository<PieceHistorique, Long> {
    List<PieceHistorique> findByPieceIdOrderByDateDesc(Long pieceId);
}
