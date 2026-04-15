package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.PieceHistorique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PieceHistoriqueRepository extends JpaRepository<PieceHistorique, Long> {
    List<PieceHistorique> findByPieceIdOrderByDateDesc(Long pieceId);
    List<PieceHistorique> findByActionOrderByDateDesc(String action);

    /**
     * INSERT natif : bypasse totalement la session Hibernate et les séquences.
     * Le prochain ID est calculé directement via MAX(id)+1 en SQL.
     */
    @Modifying
    @Transactional
    @Query(value = 
        "INSERT INTO piece_historique (id, action, date, details, piece_id, utilisateur_id) " +
        "VALUES (COALESCE((SELECT MAX(id) FROM piece_historique), 0) + 1, " +
        ":action, :date, :details, :pieceId, :userId)",
        nativeQuery = true)
    void insertHistoriqueNative(
        @Param("action") String action,
        @Param("date") LocalDateTime date,
        @Param("details") String details,
        @Param("pieceId") Long pieceId,
        @Param("userId") String userId
    );

    @Modifying
    @Transactional
    void deleteByPieceId(Long pieceId);
}
