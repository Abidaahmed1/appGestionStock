package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface PieceDetacheeRepository extends JpaRepository<PieceDetachee, Long> {
    @Query("SELECT p FROM PieceDetachee p WHERE p.quantite < p.seuilMinimum AND p.archivee = false AND p.entreprise = :entreprise")
    public List<PieceDetachee> findLowStock(@Param("entreprise") Entreprise entreprise);

    public List<PieceDetachee> findByArchivee(boolean rep);

    public List<PieceDetachee> findByArchiveeAndEntreprise(boolean archivee, Entreprise entreprise);

    public List<PieceDetachee> findByEntreprise(Entreprise entreprise);

    public boolean existsByReference(String reference);

    public boolean existsByReferenceAndEntreprise(String reference, Entreprise entreprise);

    public PieceDetachee findFirstByReferenceOrderByIdDesc(String reference);

    public java.util.Optional<PieceDetachee> findByReferenceAndEntreprise(String reference, Entreprise entreprise);

    public PieceDetachee findFirstByReferenceAndEntrepriseOrderByIdDesc(String reference, Entreprise entreprise);

    public java.util.Optional<PieceDetachee> findByCodeBarreAndEntreprise(String codeBarre, Entreprise entreprise);
}
