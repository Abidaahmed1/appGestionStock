package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

public interface PieceDetacheeRepository extends JpaRepository<PieceDetachee, Long> {
    public List<PieceDetachee> findByArchivee(boolean rep);

    public boolean existsByCodeBarre(String code);

    public PieceDetachee findByCodeBarre(String code);

    public boolean existsByReference(String reference);

    public PieceDetachee findByReference(String reference);
}
