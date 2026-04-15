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
import com.gestionStock.backend.entity.notification.NotificationType;
import com.gestionStock.backend.entity.user.Role;
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
    private final DetailPieceRepository detailPieceRepo;
    private final PieceHistoriqueRepository historiqueRepo;
    private final NotificationService notificationService;
    private final UserService userService;
    private final UniteRepository uniteRepo;
    private final com.gestionStock.backend.repository.fournisseur.PieceFournisseurRepository pieceFournisseurRepo;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;
    private final jakarta.persistence.EntityManager entityManager;

    public void recordHistory(PieceDetachee piece, String action, String details) {
        try {
            String userId = userService.getCurrentUser()
                    .map(u -> u.getId().toString())
                    .orElse(null);
            historiqueRepo.insertHistoriqueNative(
                    action,
                    java.time.LocalDateTime.now(),
                    details,
                    piece.getId(),
                    userId);
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
        if (detail.getParametre() == null) {
            return "Variante #" + (detail.getId() != null ? detail.getId() : "nouvelle");
        }
        return detail.getParametre().getNom() + ": " + detail.getValeur();
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

    public List<PieceDetachee> findLowStockPieces() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return this.pieceRepo.findLowStock(entreprise);
    }

    private void checkBarcodeDuplicate(PieceDetachee piece,
            com.gestionStock.backend.entity.entreprise.Entreprise entreprise) {
        if (piece.getCodeBarre() != null && !piece.getCodeBarre().trim().isEmpty()) {
            String cleanCode = piece.getCodeBarre().trim();
            java.util.List<PieceDetachee> duplicates = pieceRepo.findByCodeBarreAndEntreprise(cleanCode, entreprise);

            for (PieceDetachee existing : duplicates) {
                // Si l'ID est différent, c'est un vrai doublon (pas la même pièce qu'on est en
                // train de modifier)
                if (piece.getId() == null || !existing.getId().equals(piece.getId())) {
                    throw new PieceException("Impossible d'enregistrer : Le code-barres [" + cleanCode +
                            "] est déjà utilisé par la pièce [" + existing.getDesignation() +
                            "] (Référence: " + existing.getReference() + ").");
                }
            }
        }
    }

    public PieceDetachee addPiece(PieceDetachee piece) {
        if (piece.getVariations() != null && !piece.getVariations().isEmpty()) {
            return saveBulkVariations(piece);
        }
        return saveSinglePiece(piece);
    }

    private PieceDetachee saveBulkVariations(PieceDetachee template) {
        PieceDetachee firstSaved = null;
        int variantCount = template.getVariations().size();
        for (PieceDetachee variant : template.getVariations()) {
            variant.setDesignation(template.getDesignation());
            variant.setCategorie(template.getCategorie());
            variant.setUnite(template.getUnite());
            variant.setSeuilMinimum(template.getSeuilMinimum());
            variant.setSeuilMaximum(template.getSeuilMaximum());
            variant.setDescription(template.getDescription());
            variant.setImageUrl(template.getImageUrl());
            variant.setProduitsAssocies(
                    template.getProduitsAssocies() != null ? new HashSet<>(template.getProduitsAssocies())
                            : new HashSet<>());

            if (variant.getPrixVente() == null || variant.getPrixVente() == 0.0) {
                variant.setPrixVente(template.getPrixVente() != null ? template.getPrixVente() : 0.0);
            }
            if (variant.getTauxTVA() == null || variant.getTauxTVA() == 0.0) {
                variant.setTauxTVA(template.getTauxTVA() != null ? template.getTauxTVA() : 0.0);
            }

            if (variant.getArchivee() == null)
                variant.setArchivee(template.getArchivee() != null ? template.getArchivee() : false);

            PieceDetachee saved = saveSinglePieceNoNotify(variant);
            if (firstSaved == null)
                firstSaved = saved;
        }

        if (firstSaved != null) {
            notificationService.createNotificationForRoles(
                    "Nouvelle pièce avec variantes ajoutée",
                    variantCount + " variante(s) de la pièce '" + firstSaved.getDesignation()
                            + "' ont été créées avec un stock initial de 0.",
                    NotificationType.INFO,
                    List.of(Role.RESPONSABLE_LOGISTIQUE, Role.ADMINISTRATEUR),
                    firstSaved.getId());
        }
        return firstSaved;
    }

    private PieceDetachee saveSinglePiece(PieceDetachee piece) {
        PieceDetachee saved = saveSinglePieceNoNotify(piece);
        notificationService.createNotificationForRoles(
                "Nouvelle pièce ajoutée",
                "La pièce '" + saved.getDesignation()
                        + "' (réf: " + saved.getReference() + ") a été créée avec un stock initial de 0.",
                NotificationType.INFO,
                List.of(Role.RESPONSABLE_LOGISTIQUE, Role.ADMINISTRATEUR),
                saved.getId());
        return saved;
    }

    private PieceDetachee saveSinglePieceNoNotify(PieceDetachee piece) {
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

        checkBarcodeDuplicate(piece, entreprise);

        piece.setQuantite(0);

        if (piece.getDetails() != null) {
            for (DetailPiece detail : piece.getDetails()) {
                detail.setPiece(piece);
            }
        }

        PieceDetachee savedPiece = this.pieceRepo.save(piece);

        if (savedPiece.getDetails() != null && !savedPiece.getDetails().isEmpty()) {
            for (DetailPiece dp : savedPiece.getDetails()) {
                this.detailPieceRepo.save(dp);
            }
        }

        if (produitsToAssociate != null) {
            for (ProduitFini p : produitsToAssociate) {
                if (p.getId() != null) {
                    ProduitFini managedProd = produitRepo.findById(p.getId()).orElse(null);
                    if (managedProd != null) {
                        if (managedProd.getPieces() == null)
                            managedProd.setPieces(new HashSet<>());
                        managedProd.getPieces().add(savedPiece);
                        produitRepo.save(managedProd);
                        savedPiece.getProduitsAssocies().add(managedProd);
                    }
                }
            }
        }

        recordHistory(savedPiece, "Création", "créé par");
        return savedPiece;
    }

    public PieceDetachee updateImageUrl(Long id, String imageUrl) {
        return pieceRepo.findById(id)
                .map(p -> {
                    p.setImageUrl(imageUrl);
                    PieceDetachee saved = pieceRepo.save(p);

                    if (p.getEntreprise() != null && p.getDesignation() != null) {
                        pieceRepo.findByArchiveeAndEntreprise(false, p.getEntreprise())
                                .stream()
                                .filter(s -> !s.getId().equals(p.getId())
                                        && p.getDesignation().equals(s.getDesignation())
                                        && (s.getImageUrl() == null || s.getImageUrl().trim().isEmpty()))
                                .forEach(s -> {
                                    s.setImageUrl(imageUrl);
                                    pieceRepo.save(s);
                                });
                    }

                    return saved;
                })
                .orElse(null);
    }

    public PieceDetachee updateQuantity(Long id, Integer quantityToAdd) {
        PieceDetachee piece = pieceRepo.findById(id)
                .orElseThrow(() -> new com.gestionStock.backend.exceptions.PieceException("Pièce non trouvée"));

        int previousQty = piece.getQuantite() != null ? piece.getQuantite() : 0;
        int newQty = previousQty + quantityToAdd;
        piece.setQuantite(newQty);

        PieceDetachee saved = pieceRepo.save(piece);
        recordHistory(saved, "Mise à jour stock",
                "Quantité " + (quantityToAdd >= 0 ? "ajoutée: " : "retirée: ") + Math.abs(quantityToAdd)
                        + ". Nouveau total: " + saved.getQuantite());

        checkStockAlerts(saved, previousQty);

        return saved;
    }

    private void checkStockAlerts(PieceDetachee piece, int previousQty) {
        int newQty = piece.getQuantite() != null ? piece.getQuantite() : 0;
        int minSeuil = piece.getSeuilMinimum() != null ? piece.getSeuilMinimum() : 0;
        String designation = piece.getDesignation();
        String ref = piece.getReference();

        String variantLabel = "";
        if (piece.getDetails() != null && !piece.getDetails().isEmpty()) {
            try {
                String v = piece.getDetails().stream()
                        .filter(d -> d != null && d.getParametre() != null && d.getValeur() != null
                                && !d.getValeur().trim().isEmpty() && !d.getValeur().equals("-"))
                        .map(d -> d.getParametre().getNom() + ": " + d.getValeur())
                        .collect(java.util.stream.Collectors.joining(", "));
                if (!v.isEmpty())
                    variantLabel = " [" + v + "]";
            } catch (Exception ignored) {
            }
        }

        List<Role> targetRoles = List.of(
                Role.ADMINISTRATEUR,
                Role.RESPONSABLE_LOGISTIQUE,
                Role.MAGASINIER,
                Role.AUDITEUR);

        try {
            if (newQty <= 0 && previousQty > 0) {
                notificationService.createNotificationForRoles(
                        "Rupture de Stock : " + designation,
                        "ALERTE ! La pièce '" + designation + variantLabel + "' (Réf: " + ref
                                + ") est en RUPTURE DE STOCK. Réapprovisionnement urgent requis.",
                        NotificationType.RUPTURE_STOCK,
                        targetRoles,
                        piece.getId());

            } else if (newQty < minSeuil && previousQty >= minSeuil) {
                notificationService.createNotificationForRoles(
                        " Stock Bas (Réserve) : " + designation,
                        "Attention ! La pièce '" + designation + variantLabel + "' (Réf: " + ref
                                + ") est passée sous son seuil minimum.\nQuantité actuelle: " + newQty
                                + " / Seuil min: " + minSeuil + ". Pensez à commander.",
                        NotificationType.WARNING,
                        targetRoles,
                        piece.getId());
            }
        } catch (Exception e) {
            System.err.println("[STOCK ALERT] Erreur lors de l'envoi de la notification de stock: " + e.getMessage());
        }
    }

    public void delete(Long id) {
        PieceDetachee p = this.pieceRepo.findById(id).orElse(null);
        if (p == null)
            return;

        p.setArchivee(true);
        this.pieceRepo.save(p);
        recordHistory(p, "Archivage", "Pièce archivée par l'utilisateur");
    }

    @Transactional
    public void deletePermanently(Long id) {
        if (id == null) {
            throw new PieceException("L'ID de la pièce est manquant.");
        }

        System.out.println("[DEBUG] Suppression définitive de la pièce ID: " + id);

        PieceDetachee p = this.pieceRepo.findById(id)
                .orElseThrow(() -> new PieceException(
                        "Impossible de supprimer définitivement cette pièce car elle est encore référencée ailleurs (Historique, Inventaires ou Bons)."));

        try {
            // 1. Supprimer les associations ManyToMany avec Produits
            if (p.getProduitsAssocies() != null) {
                for (ProduitFini pf : p.getProduitsAssocies()) {
                    pf.getPieces().remove(p);
                    produitRepo.save(pf);
                }
                p.getProduitsAssocies().clear();
            }

            // 2. Supprimer les associations avec Fournisseurs (PieceFournisseur)
            // Table "fournisseur_pieces" mentionnée par l'utilisateur
            pieceFournisseurRepo.deleteByPiece(p);

            // 3. Supprimer tout l'historique lié (optionnel mais conseillé pour suppression
            // "définitive")
            historiqueRepo.deleteByPieceId(id);

            // 4. Supprimer la pièce elle-même
            this.pieceRepo.delete(p);
            this.pieceRepo.flush();

            System.out.println("[DEBUG] Pièce " + id + " supprimée avec succès.");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new PieceException(
                    "Impossible de supprimer définitivement cette pièce car elle est encore référencée ailleurs (Historique, Inventaires ou Bons).");
        } catch (Exception e) {
            throw new PieceException("Erreur lors de la suppression définitive : " + e.getMessage());
        }
    }

    public List<PieceDetachee> findArchived() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return this.pieceRepo.findByArchiveeAndEntreprise(true, entreprise);
    }

    public PieceDetachee restore(Long id) {
        PieceDetachee p = this.pieceRepo.findById(id).orElse(null);
        if (p == null)
            return null;

        p.setArchivee(false);
        PieceDetachee saved = this.pieceRepo.save(p);
        recordHistory(saved, "Restauration", "Pièce restaurée de l'archive par l'administrateur");
        return saved;
    }

    public PieceDetachee findByReference(String reference) {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise != null) {
            return pieceRepo.findFirstByReferenceAndEntrepriseOrderByIdDesc(reference, entreprise);
        }
        return pieceRepo.findFirstByReferenceOrderByIdDesc(reference);
    }

    public PieceDetachee update(Long id, PieceDetachee piece) {
        // System.out.println("[DEBUG] Service.update called for ID: " + id + " |
        // Designation: " + piece.getDesignation());
        return updateInternal(id, piece, true);
    }

    private PieceDetachee updateInternal(Long id, PieceDetachee piece, boolean isRoot) {
        // System.out.println("[DEBUG] updateInternal called for ID: " + id);

        entityManager.clear();

        java.util.Optional<PieceDetachee> opt = pieceRepo.findById(id);

        if (opt.isEmpty() && piece.getReference() != null) {
            System.out.println("[DEBUG] findById failed for " + id + ", trying fallback by reference...");
            opt = pieceRepo.findByReferenceAndEntreprise(piece.getReference(), userService.getCurrentUserEntreprise());
        }

        if (opt.isEmpty()) {
            System.err.println("[ERROR] Final check: Piece NOT FOUND even with fallback for ID: " + id);
            throw new PieceException("Pièce non trouvée avec l'ID : " + id);
        }

        PieceDetachee existingPiece = opt.get();
        System.out.println("[DEBUG] Success! Working with piece: " + existingPiece.getDesignation() + " (ID: "
                + existingPiece.getId() + ")");

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

        if (piece.getDesignation() != null && !piece.getDesignation().trim().isEmpty()) {
            existingPiece.setDesignation(piece.getDesignation());
        }
        if (piece.getReference() != null && !piece.getReference().trim().isEmpty()) {
            existingPiece.setReference(piece.getReference());
        }
        existingPiece.setSeuilMinimum(piece.getSeuilMinimum());
        existingPiece.setSeuilMaximum(piece.getSeuilMaximum());
        existingPiece.setArchivee(piece.isArchivee());
        existingPiece.setDescription(piece.getDescription());
        existingPiece.setImageUrl(piece.getImageUrl());
        if (piece.getCodeBarre() != null && !piece.getCodeBarre().trim().isEmpty()) {
            existingPiece.setCodeBarre(piece.getCodeBarre());
        }
        existingPiece.setPrixVente(piece.getPrixVente());
        existingPiece.setTauxTVA(piece.getTauxTVA());

        checkBarcodeDuplicate(existingPiece, entreprise);

        System.out.println("Incoming Produits size: "
                + (piece.getProduitsAssocies() != null ? piece.getProduitsAssocies().size() : 0));

        handleCategory(piece);
        handleUnite(piece);
        // Only overwrite if the incoming value is non-null to avoid clearing a required
        // field
        if (piece.getCategorie() != null) {
            existingPiece.setCategorie(piece.getCategorie());
        }
        if (piece.getUnite() != null) {
            existingPiece.setUnite(piece.getUnite());
        }

        StringBuilder detailDiff = new StringBuilder();
        if (piece.getDetails() != null) {
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
                if (updatedDetail.getId() != null) {
                    existingPiece.getDetails().stream()
                            .filter(d -> d.getId().equals(updatedDetail.getId()))
                            .findFirst()
                            .ifPresent(existingDetail -> {
                                String vLabel = getVariantLabel(existingDetail);
                                if (!java.util.Objects.equals(existingDetail.getValeur(), updatedDetail.getValeur())) {
                                    detailDiff.append(" valeur (").append(vLabel).append(") de '")
                                            .append(existingDetail.getValeur()).append("' vers '")
                                            .append(updatedDetail.getValeur()).append("';");
                                }
                                existingDetail.setParametre(updatedDetail.getParametre());
                                existingDetail.setValeur(updatedDetail.getValeur());
                            });
                } else {
                    // Add new
                    detailDiff.append(" nouvelle variante '").append(getVariantLabel(updatedDetail))
                            .append("' ajoutée;");
                    updatedDetail.setPiece(existingPiece);
                    existingPiece.getDetails().add(updatedDetail);
                }
            }
        }

        Set<ProduitFini> incomingProduits = piece.getProduitsAssocies() != null ? piece.getProduitsAssocies()
                : new HashSet<>();
        Set<Long> incomingIds = incomingProduits.stream()
                .filter(p -> p.getId() != null)
                .map(ProduitFini::getId)
                .collect(Collectors.toSet());

        Set<ProduitFini> currentlyAssociated = new HashSet<>(existingPiece.getProduitsAssocies());
        Set<Long> currentIds = currentlyAssociated.stream().map(ProduitFini::getId).collect(Collectors.toSet());

        boolean associationsChanged = !currentIds.equals(incomingIds);
        if (associationsChanged) {
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
        }

        String changeDetails = buildChangeDescription(oldState, existingPiece);
        if (detailDiff.length() > 0) {
            changeDetails += " | Détails Variantes : " + detailDiff.toString();
        }

        PieceDetachee saved = pieceRepo.save(existingPiece);

        if (piece.getVariations() != null && !piece.getVariations().isEmpty()) {
            Set<Long> incomingVariantIds = piece.getVariations().stream()
                    .filter(v -> v.getId() != null)
                    .map(PieceDetachee::getId)
                    .collect(Collectors.toSet());

            pieceRepo.findByArchiveeAndEntreprise(false, entreprise)
                    .stream()
                    .filter(s -> !s.getId().equals(id)
                            && s.getDesignation().equalsIgnoreCase(oldState.getDesignation()))
                    .forEach(s -> {
                        if (!incomingVariantIds.contains(s.getId())) {
                            s.setArchivee(true);
                            pieceRepo.save(s);
                            recordHistory(s, "Archivage automatique",
                                    "Archivé car retiré du modèle parent '" + saved.getDesignation() + "'");
                        }
                    });

            for (PieceDetachee vReq : piece.getVariations()) {
                if (vReq.getId() != null && vReq.getId().equals(id)) {
                    continue;
                }

                vReq.setDesignation(saved.getDesignation());
                vReq.setCategorie(saved.getCategorie());
                vReq.setUnite(saved.getUnite());

                if (vReq.getId() != null) {
                    List<PieceDetachee> subVars = vReq.getVariations();
                    vReq.setVariations(null);
                    updateInternal(vReq.getId(), vReq, false);
                    vReq.setVariations(subVars);
                } else {
                    saveSinglePieceNoNotify(vReq);
                }
            }
        }

        recordHistory(saved, "Modification", changeDetails);
        if (isRoot) {
            pieceRepo.flush();
        }
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
            // Replace the shell object with the managed entity from DB
            uniteRepo.findById(piece.getUnite().getId()).ifPresent(piece::setUnite);
        }
        // If unite is still null here, it will be caught by the @NotNull guard
        // in updateInternal (existing value is kept) or by Bean Validation on create.
    }

}
