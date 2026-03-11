package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.exceptions.PieceException;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.repository.piece.DetailPieceRepository;
import com.gestionStock.backend.entity.piece.DetailPiece;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.piece.UniteRepository;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import com.gestionStock.backend.repository.piece.ProduitFiniRepository;
import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.entity.notification.NotificationType;
import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.repository.stock.StockRepository;
import com.gestionStock.backend.service.notification.NotificationService;
import com.gestionStock.backend.service.user.UserService;
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

    private static final Object PIECE_LOCK = new Object();
    private final PieceDetacheeRepository pieceRepo;
    private final CategorieRepository categorieRepo;
    private final ProduitFiniRepository produitRepo;
    private final StockRepository stockRepo;
    private final DetailPieceRepository detailPieceRepo;
    private final NotificationService notificationService;
    private final UserService userService;
    private final UniteRepository uniteRepo;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    public List<PieceDetachee> getAll() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return pieceRepo.findByEntreprise(entreprise);
    }

    public List<PieceDetachee> findByActive() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return this.pieceRepo.findByArchiveeAndEntreprise(false, entreprise);
    }

    public PieceDetachee addPiece(PieceDetachee piece) {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (piece.getReference() == null || piece.getReference().trim().isEmpty()
                || "AUTO".equalsIgnoreCase(piece.getReference())) {
            synchronized (PIECE_LOCK) {
                piece.setReference(numerotationService.generateNextNumber("PIECE"));
            }
        } else {
            numerotationService.validateReference("PIECE", piece.getReference());
        }

        if (entreprise != null && this.pieceRepo.existsByReferenceAndEntreprise(piece.getReference(), entreprise)) {
            throw new PieceException("Une pièce avec cette référence '" + piece.getReference() + "' existe déjà.");
        }

        piece.setEntreprise(entreprise);

        handleCategory(piece);
        handleUnite(piece);

        Set<ProduitFini> produitsToAssociate = piece.getProduitsAssocies();
        piece.setProduitsAssocies(new HashSet<>());

        if (piece.getDetails() != null) {
            for (DetailPiece detail : piece.getDetails()) {
                if (detail.getCodeBarre() != null && !detail.getCodeBarre().trim().isEmpty()) {
                    detailPieceRepo.findByCodeBarreAndPieceEntreprise(detail.getCodeBarre(), entreprise)
                            .ifPresent(existing -> {
                                throw new PieceException("Le code barre '" + detail.getCodeBarre() +
                                        "' est déjà utilisé par la pièce '" + existing.getPiece().getDesignation()
                                        + "'.");
                            });
                }
                detail.setPiece(piece);
            }
        }

        PieceDetachee savedPiece = this.pieceRepo.save(piece);

        if (savedPiece.getDetails() != null && !savedPiece.getDetails().isEmpty()) {
            for (DetailPiece dp : savedPiece.getDetails()) {
                Stock stock = new Stock();
                stock.setPiece(savedPiece);
                stock.setQuantite(0);
                stock.setType(TypeStock.RUPTURE_STOCK);

                stock = this.stockRepo.save(stock);
                dp.setStock(stock);
                this.detailPieceRepo.save(dp);
            }
        } else {
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

    public void delete(Long id) {
        PieceDetachee p = this.pieceRepo.findById(id).orElse(null);
        if (p == null)
            return;

        boolean hasStock = stockRepo.existsByPieceIdAndQuantiteGreaterThan(p.getId(), 0);
        if (hasStock) {
            throw new IllegalStateException(
                    "Impossible de supprimer la pièce '" + p.getDesignation() +
                            "' car elle possède encore du stock. Veuillez d'abord vider le stock.");
        }

        p.setArchivee(true);
        this.pieceRepo.save(p);
    }

    public PieceDetachee findByReference(String reference) {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise != null) {
            return pieceRepo.findFirstByReferenceAndEntrepriseOrderByIdDesc(reference, entreprise);
        }
        return pieceRepo.findFirstByReferenceOrderByIdDesc(reference);
    }

    public PieceDetachee update(Long id, PieceDetachee piece) {
        PieceDetachee existingPiece = pieceRepo.findById(id)
                .orElseThrow(() -> new PieceException("Pièce non trouvée avec l'ID : " + id));

        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = existingPiece.getEntreprise();
        if (entreprise == null) {
            entreprise = userService.getCurrentUserEntreprise();
            existingPiece.setEntreprise(entreprise);
        }

        if (!existingPiece.getReference().equals(piece.getReference())) {
            numerotationService.validateReference("PIECE", piece.getReference());
        }

        PieceDetachee pieceWithSameCode = pieceRepo.findFirstByReferenceAndEntrepriseOrderByIdDesc(piece.getReference(),
                entreprise);
        if (pieceWithSameCode != null && !pieceWithSameCode.getId().equals(id)) {
            throw new PieceException(
                    "La référence '" + piece.getReference()
                            + "' est déjà utilisée par une autre pièce dans votre entreprise.");
        }

        existingPiece.setDesignation(piece.getDesignation());
        existingPiece.setReference(piece.getReference());
        existingPiece.setSeuilMinimum(piece.getSeuilMinimum());
        existingPiece.setSeuilMaximum(piece.getSeuilMaximum());
        existingPiece.setArchivee(piece.isArchivee());
        if (piece.getImageUrl() != null) {
            existingPiece.setImageUrl(piece.getImageUrl());
        }

        handleCategory(piece);
        handleUnite(piece);
        existingPiece.setCategorie(piece.getCategorie());
        existingPiece.setUnite(piece.getUnite());

        if (piece.getDetails() != null) {
            Set<Long> updatedDetailIds = piece.getDetails().stream()
                    .filter(d -> d.getId() != null)
                    .map(DetailPiece::getId)
                    .collect(Collectors.toSet());

            existingPiece.getDetails().removeIf(d -> d.getId() != null && !updatedDetailIds.contains(d.getId()));

            for (DetailPiece updatedDetail : piece.getDetails()) {
                if (updatedDetail.getCodeBarre() != null && !updatedDetail.getCodeBarre().trim().isEmpty()) {
                    detailPieceRepo.findByCodeBarreAndPieceEntreprise(updatedDetail.getCodeBarre().trim(), entreprise)
                            .ifPresent(existingWithCode -> {
                                if (updatedDetail.getId() == null
                                        || !existingWithCode.getId().equals(updatedDetail.getId())) {
                                    throw new PieceException("Le code barre '" + updatedDetail.getCodeBarre()
                                            + "' est déjà utilisé par la pièce '"
                                            + existingWithCode.getPiece().getDesignation() + "'.");
                                }
                            });
                }

                if (updatedDetail.getId() != null) {
                    // Update existing
                    existingPiece.getDetails().stream()
                            .filter(d -> d.getId().equals(updatedDetail.getId()))
                            .findFirst()
                            .ifPresent(existingDetail -> {
                                existingDetail.setAttributs(updatedDetail.getAttributs());
                                existingDetail.setCodeBarre(updatedDetail.getCodeBarre());
                                existingDetail.setPrixVente(updatedDetail.getPrixVente());
                                existingDetail.setTauxTVA(updatedDetail.getTauxTVA());
                            });
                } else {
                    // Add new
                    updatedDetail.setPiece(existingPiece);

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

        // 4. Many-to-Many Synchronization (OWNER SIDE IS PRODUIT FINI)
        Set<ProduitFini> incomingProduits = piece.getProduitsAssocies() != null ? piece.getProduitsAssocies()
                : new HashSet<>();
        Set<Long> incomingIds = incomingProduits.stream()
                .filter(p -> p.getId() != null)
                .map(ProduitFini::getId)
                .collect(Collectors.toSet());

        // Products to REMOVE (were associated but not in incoming)
        Set<ProduitFini> currentlyAssociated = new HashSet<>(existingPiece.getProduitsAssocies());
        for (ProduitFini prod : currentlyAssociated) {
            if (!incomingIds.contains(prod.getId())) {
                ProduitFini managedProd = produitRepo.findById(prod.getId()).orElse(null);
                if (managedProd != null) {
                    managedProd.getPieces().remove(existingPiece);
                    produitRepo.save(managedProd);
                }
                existingPiece.getProduitsAssocies().remove(prod);
            }
        }

        // Products to ADD (in incoming but not currently associated)
        Set<Long> currentIds = currentlyAssociated.stream().map(ProduitFini::getId).collect(Collectors.toSet());
        for (ProduitFini prod : incomingProduits) {
            if (prod.getId() != null && !currentIds.contains(prod.getId())) {
                ProduitFini managedProd = produitRepo.findById(prod.getId()).orElse(null);
                if (managedProd != null) {
                    managedProd.getPieces().add(existingPiece);
                    produitRepo.save(managedProd);
                    existingPiece.getProduitsAssocies().add(managedProd);
                }
            }
        }

        return pieceRepo.save(existingPiece);
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

    private void handleUnite(PieceDetachee piece) {
        if (piece.getUnite() != null && piece.getUnite().getId() != null) {
            uniteRepo.findById(piece.getUnite().getId()).ifPresent(piece::setUnite);
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
                    produitRepo.save(managedProd);
                }
            }
        }
    }
}
