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

    @Query("SELECT DISTINCT p FROM PieceDetachee p LEFT JOIN FETCH p.categorie LEFT JOIN FETCH p.unite WHERE p.archivee = :archivee AND p.entreprise = :entreprise ORDER BY p.designation ASC")
    public List<PieceDetachee> findByArchiveeAndEntreprise(@Param("archivee") boolean archivee,
            @Param("entreprise") Entreprise entreprise);

    public List<PieceDetachee> findByEntreprise(Entreprise entreprise);

    public boolean existsByReference(String reference);

    public boolean existsByReferenceAndEntreprise(String reference, Entreprise entreprise);

    public PieceDetachee findFirstByReferenceOrderByIdDesc(String reference);

    public java.util.Optional<PieceDetachee> findByReferenceAndEntreprise(String reference, Entreprise entreprise);

    public PieceDetachee findFirstByReferenceAndEntrepriseOrderByIdDesc(String reference, Entreprise entreprise);

    public List<PieceDetachee> findByCodeBarreAndEntreprise(String codeBarre, Entreprise entreprise);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "UPDATE piece_detachee SET quantite = COALESCE(quantite,0) + :delta WHERE id = :id", nativeQuery = true)
    int applyQuantityDelta(@Param("id") Long id, @Param("delta") int delta);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "UPDATE piece_detachee SET quantite = :qty WHERE id = :id", nativeQuery = true)
    void updateQuantityNative(@Param("id") Long id, @Param("qty") Integer qty);

    @Query("SELECT p FROM PieceDetachee p WHERE p.categorie.id IN :categoryIds AND p.archivee = false AND p.entreprise = :entreprise")
    List<PieceDetachee> findByCategoryIds(@Param("categoryIds") List<Long> categoryIds, @Param("entreprise") Entreprise entreprise);
}
