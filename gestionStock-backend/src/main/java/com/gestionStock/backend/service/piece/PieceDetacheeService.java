package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.exceptions.PieceException;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.repository.piece.DetailPieceRepository;
import com.gestionStock.backend.entity.piece.DetailPiece;
import com.gestionStock.backend.repository.piece.PieceHistoriqueRepository;
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
    private final PieceHistoriqueRepository historiqueRepo;
    private final NotificationService notificationService;
    private final UserService userService;
    private final UniteRepository uniteRepo;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    private void recordHistory(PieceDetachee piece, String action, String details) {
        try {
            com.gestionStock.backend.entity.user.User currentUser = userService.getCurrentUser().orElse(null);
            com.gestionStock.backend.entity.piece.PieceHistorique history = com.gestionStock.backend.entity.piece.PieceHistorique
                    .builder()
                    .piece(piece)
                    .date(java.time.LocalDateTime.now())
                    .action(action)
                    .details(details)
                    .utilisateur(currentUser)
                    .build();
            historiqueRepo.save(history);
        } catch (Exception e) {
            System.err.println("Failed to record history: " + e.getMessage());
        }
    }

    private String buildChangeDescription(PieceDetachee old, PieceDetachee updated) {
        StringBuilder desc = new StringBuilder("Modification :");
        boolean changes = false;

        if (!java.util.Objects.equals(old.getDesignation(), updated.getDesignation())) {
            desc.append(" désignation de '").append(old.getDesignation()).append("' vers '")
                    .append(updated.getDesignation()).append("';");
            changes = true;
        }
        if (!java.util.Objects.equals(old.getReference(), updated.getReference())) {
            desc.append(" référence de '").append(old.getReference()).append("' vers '")
                    .append(updated.getReference()).append("';");
            changes = true;
        }
        if (old.getSeuilMinimum() != updated.getSeuilMinimum()) {
            desc.append(" seuil min de ").append(old.getSeuilMinimum()).append(" vers ")
                    .append(updated.getSeuilMinimum()).append(";");
            changes = true;
        }
        if (old.getSeuilMaximum() != updated.getSeuilMaximum()) {
            desc.append(" seuil max de ").append(old.getSeuilMaximum()).append(" vers ")
                    .append(updated.getSeuilMaximum()).append(";");
            changes = true;
        }
        if (!java.util.Objects.equals(old.getDescription(), updated.getDescription())) {
            desc.append(" description de '").append(old.getDescription() != null ? old.getDescription() : "")
                    .append("' vers '")
                    .append(updated.getDescription() != null ? updated.getDescription() : "").append("';");
            changes = true;
        }
        if (old.getCategorie() != updated.getCategorie()) {
            String oldCat = old.getCategorie() != null ? old.getCategorie().getNom() : "--";
            String newCat = updated.getCategorie() != null ? updated.getCategorie().getNom() : "--";
            desc.append(" catégorie de '").append(oldCat).append("' vers '").append(newCat).append("';");
            changes = true;
        }
        if (old.getUnite() != updated.getUnite()) {
            String oldUnite = old.getUnite() != null ? old.getUnite().getNom() : "--";
            String newUnite = updated.getUnite() != null ? updated.getUnite().getNom() : "--";
            desc.append(" unité de '").append(oldUnite).append("' vers '").append(newUnite).append("';");
            changes = true;
        }

        return changes ? desc.toString() : "Mise à jour sans changement majeur";
    }

    private String getVariantLabel(DetailPiece detail) {
        if (detail.getAttributs() == null || detail.getAttributs().isEmpty()) {
            return "Variante #" + (detail.getId() != null ? detail.getId() : "nouvelle");
        }
        return detail.getAttributs().values().stream()
                .map(Object::toString)
                .collect(java.util.stream.Collectors.joining(" - "));
    }

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

    private void checkInternalBarcodeDuplicates(Set<DetailPiece> details) {
        if (details == null)
            return;
        Set<String> barcodes = new HashSet<>();
        for (DetailPiece detail : details) {
            String cb = detail.getCodeBarre();
            if (cb != null && !cb.trim().isEmpty()) {
                if (!barcodes.add(cb.trim())) {
                    throw new PieceException(
                            "Le code barre '" + cb + "' est dupliqué dans les variantes de cette pièce.");
                }
            }
        }
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
            checkInternalBarcodeDuplicates(piece.getDetails());
            for (DetailPiece detail : piece.getDetails()) {
                if (detail.getCodeBarre() != null && !detail.getCodeBarre().trim().isEmpty()) {
                    String cleanCode = detail.getCodeBarre().trim();
                    detailPieceRepo.findByCodeBarreAndPieceEntreprise(cleanCode, entreprise)
                            .ifPresent(existing -> {
                                throw new PieceException("Le code barre '" + cleanCode +
                                        "' est déjà utilisé par la pièce '" + existing.getPiece().getDesignation()
                                        + "' dans votre entreprise.");
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

        // Populate associated products (bidirectional)
        if (produitsToAssociate != null) {
            for (ProduitFini p : produitsToAssociate) {
                if (p.getId() != null) {
                    ProduitFini managedProd = produitRepo.findById(p.getId()).orElse(null);
                    if (managedProd != null) {
                        managedProd.getPieces().add(savedPiece);
                        produitRepo.save(managedProd);
                        savedPiece.getProduitsAssocies().add(managedProd);
                    }
                }
            }
        }

        PieceDetachee savedResult = savedPiece;
        recordHistory(savedResult, "Création", "créé par");
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

        // Check for Stock
        boolean hasStock = stockRepo.existsByPieceIdAndQuantiteGreaterThan(p.getId(), 0);
        if (hasStock) {
            throw new IllegalStateException(
                    "Impossible de supprimer la pièce '" + p.getDesignation() +
                            "' car elle possède encore du stock disponible. Veuillez d'abord vider le stock.");
        }

        // Check for Associated Finished Products
        if (p.getProduitsAssocies() != null && !p.getProduitsAssocies().isEmpty()) {
            throw new IllegalStateException(
                    "Impossible de supprimer la pièce '" + p.getDesignation() +
                            "' car elle est encore associée à des produits finis.");
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

        // --- Snapshot for history ---
        PieceDetachee oldState = PieceDetachee.builder()
                .designation(existingPiece.getDesignation())
                .reference(existingPiece.getReference())
                .seuilMinimum(existingPiece.getSeuilMinimum())
                .seuilMaximum(existingPiece.getSeuilMaximum())
                .description(existingPiece.getDescription())
                .categorie(existingPiece.getCategorie())
                .unite(existingPiece.getUnite())
                .build();

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
        existingPiece.setDescription(piece.getDescription());
        System.out.println("[ANTIGRAVITY] Updating piece description to: " + piece.getDescription());
        existingPiece.setImageUrl(piece.getImageUrl());

        System.out.println("[ANTIGRAVITY] Incoming Produits size: "
                + (piece.getProduitsAssocies() != null ? piece.getProduitsAssocies().size() : 0));

        handleCategory(piece);
        handleUnite(piece);
        existingPiece.setCategorie(piece.getCategorie());
        existingPiece.setUnite(piece.getUnite());

        StringBuilder detailDiff = new StringBuilder();
        if (piece.getDetails() != null) {
            checkInternalBarcodeDuplicates(piece.getDetails());
            Set<Long> updatedDetailIds = piece.getDetails().stream()
                    .filter(d -> d.getId() != null)
                    .map(DetailPiece::getId)
                    .collect(Collectors.toSet());

            // Check for removals
            for (DetailPiece d : existingPiece.getDetails()) {
                if (d.getId() != null && !updatedDetailIds.contains(d.getId())) {
                    detailDiff.append(" variante '").append(getVariantLabel(d)).append("' supprimée;");
                }
            }

            existingPiece.getDetails().removeIf(d -> d.getId() != null && !updatedDetailIds.contains(d.getId()));

            for (DetailPiece updatedDetail : piece.getDetails()) {
                if (updatedDetail.getCodeBarre() != null && !updatedDetail.getCodeBarre().trim().isEmpty()) {
                    String cleanCode = updatedDetail.getCodeBarre().trim();
                    detailPieceRepo.findByCodeBarreAndPieceEntreprise(cleanCode, entreprise)
                            .ifPresent(existingWithCode -> {
                                if (updatedDetail.getId() == null
                                        || !existingWithCode.getId().equals(updatedDetail.getId())) {
                                    throw new PieceException("Le code barre '" + cleanCode
                                            + "' est déjà utilisé par la pièce '"
                                            + existingWithCode.getPiece().getDesignation()
                                            + "' dans votre entreprise.");
                                }
                            });
                }

                if (updatedDetail.getId() != null) {
                    existingPiece.getDetails().stream()
                            .filter(d -> d.getId().equals(updatedDetail.getId()))
                            .findFirst()
                            .ifPresent(existingDetail -> {
                                String vLabel = getVariantLabel(existingDetail);
                                if (!java.util.Objects.equals(existingDetail.getCodeBarre(),
                                        updatedDetail.getCodeBarre())) {
                                    detailDiff.append(" code barre (").append(vLabel).append(") de '")
                                            .append(existingDetail.getCodeBarre() != null
                                                    ? existingDetail.getCodeBarre()
                                                    : "")
                                            .append("' vers '")
                                            .append(updatedDetail.getCodeBarre() != null ? updatedDetail.getCodeBarre()
                                                    : "")
                                            .append("';");
                                }
                                if (!java.util.Objects.equals(existingDetail.getPrixVente(),
                                        updatedDetail.getPrixVente())) {
                                    detailDiff.append(" prix (").append(vLabel).append(") de ")
                                            .append(existingDetail.getPrixVente()).append(" vers ")
                                            .append(updatedDetail.getPrixVente()).append(";");
                                }
                                if (!java.util.Objects.equals(existingDetail.getTauxTVA(),
                                        updatedDetail.getTauxTVA())) {
                                    detailDiff.append(" TVA (").append(vLabel).append(") de ")
                                            .append(existingDetail.getTauxTVA()).append("% vers ")
                                            .append(updatedDetail.getTauxTVA()).append("%;");
                                }

                                existingDetail.setAttributs(updatedDetail.getAttributs());
                                existingDetail.setCodeBarre(updatedDetail.getCodeBarre());
                                existingDetail.setPrixVente(updatedDetail.getPrixVente());
                                existingDetail.setTauxTVA(updatedDetail.getTauxTVA());
                            });
                } else {
                    // Add new
                    detailDiff.append(" nouvelle variante '").append(getVariantLabel(updatedDetail))
                            .append("' ajoutée;");
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

        // --- Build History Diff BEFORE Saving ---
        String changeDetails = buildChangeDescription(oldState, existingPiece);
        if (detailDiff.length() > 0) {
            changeDetails += " | Détails Variantes : " + detailDiff.toString();
        }

        PieceDetachee saved = pieceRepo.save(existingPiece);
        recordHistory(saved, "Modification", changeDetails);
        pieceRepo.flush();
        System.out.println("[ANTIGRAVITY] Piece updated successfully. Final Produits size: "
                + (saved.getProduitsAssocies() != null ? saved.getProduitsAssocies().size() : 0));
        return pieceRepo.findById(id).orElse(saved);
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

}
