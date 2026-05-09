package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.DetailPiece;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DetailPieceRepository extends JpaRepository<DetailPiece, Long> {
}
