package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import com.gestionStock.backend.repository.piece.ProduitFiniRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
@Transactional
public class PieceDetacheeService {

    private final PieceDetacheeRepository pieceRepo;
    private final CategorieRepository categorieRepo;
    private final ProduitFiniRepository produitRepo;

    public List<PieceDetachee> getAll() {
        return pieceRepo.findAll();
    }

    public List<PieceDetachee> findByActive() {
        return this.pieceRepo.findByArchivee(false);
    }

    public PieceDetachee addPiece(PieceDetachee piece) {
        if (this.pieceRepo.existsByCodeBarre(piece.getCodeBarre())) {
            throw new RuntimeException("Une pièce avec ce code barre existe déjà.");
        }
        if (this.pieceRepo.existsByReference(piece.getReference())) {
            throw new RuntimeException("Une pièce avec cette référence existe déjà.");
        }

        handleCategory(piece);

        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();
        piece.setProduitsAssocies(new HashSet<>());

        PieceDetachee savedPiece = this.pieceRepo.save(piece);
        handleProductAssociations(savedPiece, produitsToAssociate);

        return savedPiece;
    }

    public PieceDetachee updateImageUrl(Long id, String imageUrl) {
        return pieceRepo.findById(id)
                .map(p -> {
                    p.setImageUrl(imageUrl);
                    return pieceRepo.save(p);
                })
                .orElse(null);
    }

    public void delete(String code) {
        PieceDetachee p = this.pieceRepo.findByCodeBarre(code);
        if (p != null) {
            p.setArchivee(true);
            this.pieceRepo.save(p);
        }
    }

    public PieceDetachee update(Long id, PieceDetachee piece) {
        PieceDetachee existingPiece = pieceRepo.findById(id).orElse(null);
        if (existingPiece == null)
            return null;

        piece.setId(id);

        PieceDetachee pieceWithSameRef = pieceRepo.findByReference(piece.getReference());
        if (pieceWithSameRef != null && !pieceWithSameRef.getId().equals(id)) {
            throw new RuntimeException("Une autre pièce utilise déjà cette référence.");
        }

        handleCategory(piece);

        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();
        piece.setProduitsAssocies(new HashSet<>());

        Set<Long> newProductIds = produitsToAssociate == null ? Set.of()
                : produitsToAssociate.stream()
                        .filter(p -> p.getId() != null)
                        .map(ProduitFini::getId)
                        .collect(Collectors.toSet());

        for (ProduitFini prod : new HashSet<>(existingPiece.getProduitsAssocies())) {
            if (prod.getId() != null && !newProductIds.contains(prod.getId())) {
                prod.getPieces().remove(existingPiece);
                produitRepo.save(prod);
            }
        }

        PieceDetachee savedPiece = pieceRepo.save(piece);
        handleProductAssociations(savedPiece, produitsToAssociate);

        return pieceRepo.findById(id).orElse(savedPiece);
    }

    private void handleCategory(PieceDetachee piece) {
        if (piece.getCategorie() != null && piece.getCategorie().getCode() != null) {
            Categorie existing = categorieRepo.findByCode(piece.getCategorie().getCode()).orElse(null);
            if (existing != null) {
                piece.setCategorie(existing);
            }
        }
    }

    private void handleProductAssociations(PieceDetachee piece, Set<ProduitFini> produits) {
        if (produits == null)
            return;

        for (ProduitFini p : produits) {
            if (p.getId() != null) {
                ProduitFini managedProd = produitRepo.findById(p.getId()).orElse(null);
                if (managedProd != null) {
                    managedProd.getPieces().add(piece);
                    piece.getProduitsAssocies().add(managedProd);
                    produitRepo.save(managedProd);
                }
            }
        }
    }
}
