package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.exceptions.PieceException;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import com.gestionStock.backend.repository.piece.ProduitFiniRepository;
import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.entity.notification.NotificationType;
import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.repository.stock.StockRepository;
import com.gestionStock.backend.service.notification.NotificationService;
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
    private final StockRepository stockRepo;
    private final NotificationService notificationService;

    public List<PieceDetachee> getAll() {
        return pieceRepo.findAll();
    }

    public List<PieceDetachee> findByActive() {
        return this.pieceRepo.findByArchivee(false);
    }

    public PieceDetachee addPiece(PieceDetachee piece) {
        if (this.pieceRepo.existsByCodeBarre(piece.getCodeBarre())) {
            throw new PieceException("Une pièce avec ce code barre existe déjà.");
        }
        if (this.pieceRepo.existsByReference(piece.getReference())) {
            throw new PieceException("Une pièce avec cette référence existe déjà.");
        }

        handleCategory(piece);

        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();
        piece.setProduitsAssocies(new HashSet<>());

        PieceDetachee savedPiece = this.pieceRepo.save(piece);
        handleProductAssociations(savedPiece, produitsToAssociate);

        Stock stock = new Stock();
        stock.setPiece(savedPiece);
        stock.setQuantite(0);
        stock.setType(TypeStock.RUPTURE_STOCK);
        stock = this.stockRepo.save(stock);

        notificationService.createNotificationForRoles(
                "Nouvelle pièce en rupture de stock",
                "La nouvelle pièce détachée '" + savedPiece.getDesignation()
                        + "' a été créée avec un stock initial de 0.",
                NotificationType.RUPTURE_STOCK,
                List.of(Role.RESPONSABLE_LOGISTIQUE, Role.AUDITEUR),
                stock.getId());

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

        PieceDetachee pieceWithSameRef = pieceRepo.findByReference(piece.getReference());
        if (pieceWithSameRef != null && !pieceWithSameRef.getId().equals(id)) {
            throw new PieceException("Une autre pièce utilise déjà cette référence.");
        }

        PieceDetachee pieceWithSameCode = pieceRepo.findByCodeBarre(piece.getCodeBarre());
        if (pieceWithSameCode != null && !pieceWithSameCode.getId().equals(id)) {
            throw new PieceException("Une autre pièce utilise déjà ce code barre.");
        }

        existingPiece.setCodeBarre(piece.getCodeBarre());
        existingPiece.setDesignation(piece.getDesignation());
        existingPiece.setPrixVente(piece.getPrixVente());
        existingPiece.setReference(piece.getReference());
        existingPiece.setSeuilMinimum(piece.getSeuilMinimum());
        existingPiece.setSeuilMaximum(piece.getSeuilMaximum());
        existingPiece.setTauxTVA(piece.getTauxTVA());
        existingPiece.setArchivee(piece.isArchivee());
        if (piece.getImageUrl() != null) {
            existingPiece.setImageUrl(piece.getImageUrl());
        }

        handleCategory(piece);
        existingPiece.setCategorie(piece.getCategorie());

        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();

        Set<Long> newProductIds = produitsToAssociate == null ? Set.of()
                : produitsToAssociate.stream()
                        .filter(p -> p.getId() != null)
                        .map(ProduitFini::getId)
                        .collect(Collectors.toSet());

        // Remove associations that are no longer present
        for (ProduitFini prod : new HashSet<>(existingPiece.getProduitsAssocies())) {
            if (prod.getId() != null && !newProductIds.contains(prod.getId())) {
                prod.getPieces().remove(existingPiece);
                existingPiece.getProduitsAssocies().remove(prod);
                produitRepo.save(prod);
            }
        }

        // Save the managed entity (no detached object — avoids UniqueConstraint on
        // Stock)
        PieceDetachee savedPiece = pieceRepo.save(existingPiece);
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
