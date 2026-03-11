package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

public interface PieceDetacheeRepository extends JpaRepository<PieceDetachee, Long> {
    public List<PieceDetachee> findByArchivee(boolean rep);

    public List<PieceDetachee> findByArchiveeAndEntreprise(boolean archivee, Entreprise entreprise);

    public List<PieceDetachee> findByEntreprise(Entreprise entreprise);

    public boolean existsByReference(String reference);

    public boolean existsByReferenceAndEntreprise(String reference, Entreprise entreprise);

    public PieceDetachee findFirstByReferenceOrderByIdDesc(String reference);

    public PieceDetachee findFirstByReferenceAndEntrepriseOrderByIdDesc(String reference, Entreprise entreprise);
}
