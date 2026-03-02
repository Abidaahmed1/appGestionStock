package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.exceptions.PieceException;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.repository.piece.DetailPieceRepository;
import com.gestionStock.backend.entity.piece.DetailPiece;
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
    private final DetailPieceRepository detailPieceRepo;
    private final NotificationService notificationService;

    public List<PieceDetachee> getAll() {
        return pieceRepo.findAll();
    }

    public List<PieceDetachee> findByActive() {
        return this.pieceRepo.findByArchivee(false);
    }

    public PieceDetachee addPiece(PieceDetachee piece) {
        // 1. Vérification unicité Code Barre
        if (this.pieceRepo.existsByCodeBarre(piece.getCodeBarre())) {
            throw new PieceException("Une pièce avec ce code barre '" + piece.getCodeBarre() + "' existe déjà.");
        }

        handleCategory(piece);

        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();
        piece.setProduitsAssocies(new HashSet<>());

        // 2. Préparer les variantes (Details)
        if (piece.getDetails() != null) {
            piece.getDetails().forEach(detail -> detail.setPiece(piece));
        }

        // 3. Sauvegarder la pièce d'abord pour avoir son ID (et ses détails via
        // cascade)
        PieceDetachee savedPiece = this.pieceRepo.save(piece);

        // 4. Initialiser les stocks pour chaque variante après que la pièce ait un ID
        if (savedPiece.getDetails() != null && !savedPiece.getDetails().isEmpty()) {
            for (DetailPiece dp : savedPiece.getDetails()) {
                Stock stock = new Stock();
                stock.setPiece(savedPiece);
                stock.setQuantite(0);
                stock.setType(TypeStock.RUPTURE_STOCK);

                // Associer le stock au détail et vice versa
                stock = this.stockRepo.save(stock);
                dp.setStock(stock);
                this.detailPieceRepo.save(dp);
            }
        } else {
            // Créer un stock par défaut si pas de variante
            Stock stock = new Stock();
            stock.setPiece(savedPiece);
            stock.setQuantite(0);
            stock.setType(TypeStock.RUPTURE_STOCK);
            stock = this.stockRepo.save(stock);

            notificationService.createNotificationForRoles(
                    "Nouvelle pièce en rupture de stock",
                    "La pièce '" + savedPiece.getDesignation()
                            + "' a été créée sans variante avec un stock initial de 0.",
                    NotificationType.RUPTURE_STOCK,
                    List.of(Role.RESPONSABLE_LOGISTIQUE, Role.AUDITEUR),
                    stock.getId());
        }

        // 5. Gérer les associations avec les produits finis
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

    public PieceDetachee findByReference(String reference) {
        return pieceRepo.findFirstByReferenceOrderByIdDesc(reference);
    }

    public PieceDetachee update(Long id, PieceDetachee piece) {
        PieceDetachee existingPiece = pieceRepo.findById(id)
                .orElseThrow(() -> new PieceException("Pièce non trouvée avec l'ID : " + id));

        // 1. Vérification unicité Code Barre (indispensable)
        PieceDetachee pieceWithSameCode = pieceRepo.findByCodeBarre(piece.getCodeBarre());
        if (pieceWithSameCode != null && !pieceWithSameCode.getId().equals(id)) {
            throw new PieceException(
                    "Le code barre '" + piece.getCodeBarre() + "' est déjà utilisé par une autre pièce.");
        }

        // 2. Mise à jour des champs de base
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

        // 3. Gestion des Variantes (Details)
        if (piece.getDetails() != null) {
            // Collecter les IDs des détails existants renvoyés par le front
            Set<Long> updatedDetailIds = piece.getDetails().stream()
                    .filter(d -> d.getId() != null)
                    .map(DetailPiece::getId)
                    .collect(Collectors.toSet());

            // Supprimer les détails qui ne sont plus présents dans la requête
            existingPiece.getDetails().removeIf(d -> d.getId() != null && !updatedDetailIds.contains(d.getId()));

            for (DetailPiece updatedDetail : piece.getDetails()) {
                if (updatedDetail.getId() != null) {
                    // Mise à jour d'un détail existant
                    existingPiece.getDetails().stream()
                            .filter(d -> d.getId().equals(updatedDetail.getId()))
                            .findFirst()
                            .ifPresent(existingDetail -> {
                                existingDetail.setAttributs(updatedDetail.getAttributs());
                                existingDetail.setParametres(updatedDetail.getParametres());
                            });
                } else {
                    // Ajout d'une nouvelle variante : éviter les doublons exacts d'attributs
                    boolean alreadyExists = existingPiece.getDetails().stream()
                            .anyMatch(d -> d.getAttributs().equals(updatedDetail.getAttributs()));

                    if (!alreadyExists) {
                        updatedDetail.setPiece(existingPiece);

                        // Création du stock pour la nouvelle variante
                        Stock stock = new Stock();
                        stock.setPiece(existingPiece);
                        stock.setQuantite(0);
                        stock.setType(TypeStock.RUPTURE_STOCK);
                        stock = this.stockRepo.save(stock);

                        updatedDetail.setStock(stock);
                        existingPiece.getDetails().add(updatedDetail);
                    }
                }
            }
        }

        handleCategory(piece);
        existingPiece.setCategorie(piece.getCategorie());

        // 4. Gestion des associations Produits Finis
        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();
        Set<Long> newProductIds = produitsToAssociate == null ? Set.of()
                : produitsToAssociate.stream()
                        .filter(p -> p.getId() != null)
                        .map(ProduitFini::getId)
                        .collect(Collectors.toSet());

        // Retirer les associations qui ne sont plus sélectionnées
        existingPiece.getProduitsAssocies().removeIf(prod -> !newProductIds.contains(prod.getId()));

        PieceDetachee savedPiece = pieceRepo.save(existingPiece);

        // Finaliser les nouvelles associations
        handleProductAssociations(savedPiece, produitsToAssociate);

        return savedPiece;
    }

    private void handleCategory(PieceDetachee piece) {
        if (piece.getCategorie() != null) {
            Categorie existing = null;
            if (piece.getCategorie().getId() != null) {
                existing = categorieRepo.findById(piece.getCategorie().getId()).orElse(null);
            } else if (piece.getCategorie().getCode() != null) {
                existing = categorieRepo.findByCode(piece.getCategorie().getCode()).orElse(null);
            }

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
