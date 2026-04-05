package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.stock.MouvementStockRepository;
import com.gestionStock.backend.service.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class MouvementStockService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MouvementStockService.class);
    private final MouvementStockRepository mouvementRepo;
    private final com.gestionStock.backend.repository.stock.BonRepository bonRepo;
    private final PieceDetacheeRepository pieceRepo;
    private final com.gestionStock.backend.repository.piece.PieceHistoriqueRepository pieceHistRepo;
    private final UserService userService;
    private final com.gestionStock.backend.service.notification.NotificationService notificationService;

    public List<MouvementStock> getAll() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            return java.util.Collections.emptyList();
        return mouvementRepo.findByBonEntreprise(entreprise);
    }

    public MouvementStock getById(Long id) {
        return mouvementRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mouvement non trouvé"));
    }

    public List<MouvementStock> getByType(TypeMouvement typeMouvement) {
        return mouvementRepo.findByTypeMouvementAndBonEntreprise(typeMouvement, userService.getCurrentUserEntreprise());
    }

    public List<MouvementStock> getByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return mouvementRepo.findByDateBetweenAndBonEntreprise(startDate, endDate,
                userService.getCurrentUserEntreprise());
    }

    public MouvementStock save(MouvementStock mouvement) {
        if (mouvement.getDate() == null) {
            mouvement.setDate(LocalDateTime.now());
        }

        double totalHTVA = 0;
        double totalTTC = 0;

        if (mouvement.getLigneMouvement() != null) {
            if (mouvement.getTypeMouvement() != null && mouvement.getTypeMouvement().name().contains("RETOUR") &&
                    mouvement.getBon() != null && mouvement.getBon().getBonOrigine() != null) {

                Long originId = mouvement.getBon().getBonOrigine().getId();
                com.gestionStock.backend.entity.Stock.Bon bonOrigine = bonRepo.findById(originId).orElse(null);

                if (bonOrigine != null && bonOrigine.getMouvement() != null) {
                    java.util.List<com.gestionStock.backend.entity.Stock.Bon> otherReturns = bonRepo
                            .findByBonOrigineId(originId);

                    for (LigneMouvement newLine : mouvement.getLigneMouvement()) {
                        if (newLine.getPiece() != null) {
                            Long pieceId = newLine.getPiece().getId();

                            int originalQty = 0;
                            PieceDetachee p = pieceRepo.findById(pieceId).orElse(null);
                            String pieceName = p != null ? p.getDesignation() : String.valueOf(pieceId);

                            for (LigneMouvement originLine : bonOrigine.getMouvement().getLigneMouvement()) {
                                if (originLine.getPiece() != null &&
                                        originLine.getPiece().getId().equals(pieceId)) {
                                    originalQty += originLine.getQuantite();
                                }
                            }

                            if (originalQty == 0) {
                                throw new IllegalArgumentException(
                                        "La pièce '" + pieceName + "' ne fait pas partie du document d'origine.");
                            }

                            int alreadyReturnedQty = 0;
                            for (com.gestionStock.backend.entity.Stock.Bon otherReturn : otherReturns) {
                                if (mouvement.getBon().getId() != null
                                        && mouvement.getBon().getId().equals(otherReturn.getId()))
                                    continue;

                                if (otherReturn.getMouvement() != null) {
                                    for (LigneMouvement existingLine : otherReturn.getMouvement().getLigneMouvement()) {
                                        if (existingLine.getPiece() != null &&
                                                existingLine.getPiece().getId().equals(pieceId)) {
                                            alreadyReturnedQty += existingLine.getQuantite();
                                        }
                                    }
                                }
                            }

                            if (alreadyReturnedQty + newLine.getQuantite() > originalQty) {
                                int remaining = originalQty - alreadyReturnedQty;
                                throw new IllegalArgumentException("Quantité de retour excessive pour '" +
                                        pieceName +
                                        "'. Reste possible : " + remaining + " (Déjà retourné : " + alreadyReturnedQty
                                        + "/" + originalQty + ").");
                            }
                        }
                    }
                }
            }

            for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
                ligne.setMouvementStock(mouvement);
                Double prix = ligne.getPrixHTVA() != null ? ligne.getPrixHTVA() : 0.0;
                Double taux = ligne.getTauxTVA() != null ? ligne.getTauxTVA() : 0.0;

                double ligneHTVA = prix * ligne.getQuantite();
                double ligneTTC = ligneHTVA * (1 + taux / 100);
                totalHTVA += ligneHTVA;
                totalTTC += ligneTTC;

                updateStockQuantity(ligne, mouvement.getTypeMouvement());
            }
        }

        mouvement.setMontantHTVA(totalHTVA);
        mouvement.setMontantTTC(totalTTC);

        return mouvementRepo.save(mouvement);
    }

    public MouvementStock update(Long id, MouvementStock mouvement) {
        if (!mouvementRepo.existsById(id)) {
            throw new EntityNotFoundException("Mouvement non trouvé");
        }
        mouvement.setId(id);
        return save(mouvement);
    }

    public void delete(Long id) {
        MouvementStock mouvement = getById(id);
        rollbackStockQuantity(mouvement);
        mouvementRepo.delete(mouvement);
    }

    private boolean isMovementEntry(TypeMouvement type) {
        if (type == null)
            return false;
        String name = type.name().toUpperCase();
        return name.contains("ENTREE") || name.contains("RECEPTION");
    }

    private boolean isMovementExit(TypeMouvement type) {
        if (type == null)
            return false;
        String name = type.name().toUpperCase();
        return name.contains("SORTIE");
    }

    public void rollbackStockQuantity(MouvementStock mouvement) {
        if (mouvement == null || mouvement.getLigneMouvement() == null) {
            return;
        }

        for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
            reverseUpdateStockQuantity(ligne, mouvement.getTypeMouvement());
        }
    }

    private void reverseUpdateStockQuantity(LigneMouvement ligne, TypeMouvement typeMouvement) {
        if (typeMouvement == null || ligne.getPiece() == null || ligne.getPiece().getId() == null)
            return;

        // Inverser la logique : Si c'était une sortie, on rajoute. Si c'était une
        // entrée, on retire.
        int delta = isMovementExit(typeMouvement) ? ligne.getQuantite() : -ligne.getQuantite();

        System.err.println("[STOCK_SYNC] ROLLBACK ID=" + ligne.getPiece().getId() + " Delta=" + delta);
        pieceRepo.applyQuantityDelta(ligne.getPiece().getId(), delta);
    }

    private void updateStockQuantity(LigneMouvement ligne, TypeMouvement typeMouvement) {
        if (typeMouvement == null || ligne.getPiece() == null || ligne.getPiece().getId() == null)
            return;

        int delta = isMovementEntry(typeMouvement) ? ligne.getQuantite() : -ligne.getQuantite();

        System.err.println("[STOCK_SYNC] UPDATE ID=" + ligne.getPiece().getId() + " Delta=" + delta);
        pieceRepo.applyQuantityDelta(ligne.getPiece().getId(), delta);

        // Sync memory object for alerts/logs
        PieceDetachee piece = pieceRepo.findById(ligne.getPiece().getId()).orElse(null);
        if (piece != null) {
            System.err.println("[STOCK_SYNC] NEW DB VALUE FOR " + piece.getReference() + ": " + piece.getQuantite());
            checkStockAlerts(piece, piece.getQuantite() - delta);
        }
    }

    private void checkStockAlerts(PieceDetachee piece, int previousQty) {
        int newQty = piece.getQuantite() != null ? piece.getQuantite() : 0;
        int minSeuil = piece.getSeuilMinimum() != null ? piece.getSeuilMinimum() : 0;
        System.err.println("[STOCK_SYNC] ALERT CHECK: Piece=" + piece.getReference() + " Qty=" + previousQty + " -> " + newQty + " (MinSeuil=" + minSeuil + ")");
        
        String detailsStr = formatDetails(piece.getDetails());

        if (newQty <= 0 && previousQty > 0) {
            System.err.println("[STOCK_SYNC] RUPTURE DETECTED!");
            String titre = "Rupture de Stock";
            String message = "Alerte ! la piéce '" + piece.getDesignation() + detailsStr + "' (" + piece.getReference()
                    + ") est en rupture de stock totale !";
            notificationService.createNotificationForRolesAndEntreprise(
                    titre,
                    message,
                    com.gestionStock.backend.entity.notification.NotificationType.RUPTURE_STOCK,
                    java.util.Arrays.asList(
                            com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR,
                            com.gestionStock.backend.entity.user.Role.RESPONSABLE_LOGISTIQUE,
                            com.gestionStock.backend.entity.user.Role.MAGASINIER,
                            com.gestionStock.backend.entity.user.Role.AUDITEUR),
                    piece.getId(),
                    piece.getEntreprise());
        } else if (newQty < minSeuil && previousQty >= minSeuil) {
            String titre = "Stock Bas (En Réserve)";
            String message = "Attention, la piéce '" + piece.getDesignation() + detailsStr
                    + "' est passée sous son seuil minimum.\nQuantité actuelle: " + newQty;
            notificationService.createNotificationForRolesAndEntreprise(
                    titre,
                    message,
                    com.gestionStock.backend.entity.notification.NotificationType.WARNING,
                    java.util.Arrays.asList(
                            com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR,
                            com.gestionStock.backend.entity.user.Role.RESPONSABLE_LOGISTIQUE),
                    piece.getId(),
                    piece.getEntreprise());
        }
    }

    private String formatDetails(java.util.List<com.gestionStock.backend.entity.piece.DetailPiece> details) {
        if (details == null || details.isEmpty())
            return "";
        try {
            String formatted = details.stream()
                    .filter(d -> d != null && d.getParametre() != null && d.getValeur() != null
                            && !d.getValeur().trim().isEmpty() && !d.getValeur().equals("-"))
                    .map(d -> d.getParametre().getNom() + ": " + d.getValeur())
                    .collect(java.util.stream.Collectors.joining(", "));
            return formatted.isEmpty() ? "" : " [" + formatted + "]";
        } catch (Exception e) {
            return "";
        }
    }

    public PieceDetachee resolvePiece(PieceDetachee incoming) {
        if (incoming == null)
            return null;

        if (incoming.getId() != null) {
            PieceDetachee found = pieceRepo.findById(incoming.getId()).orElse(null);
            if (found != null)
                return found;
        }

        String ref = incoming.getReference();
        if (ref != null && !ref.trim().isEmpty() && incoming.getEntreprise() != null) {
            PieceDetachee found = pieceRepo.findByReferenceAndEntreprise(ref, incoming.getEntreprise()).orElse(null);
            if (found != null)
                return found;
        }

        return null;
    }

    public void updateStockForMouvement(MouvementStock mouvement) {
        if (mouvement == null)
            return;

        System.err.println("[STOCK_SYNC] updateStockForMouvement for Mouvement ID: " + mouvement.getId());

        if (mouvement.getLigneMouvement() != null) {
            java.util.List<LigneMouvement> lines = new java.util.ArrayList<>(mouvement.getLigneMouvement());
            System.err.println("[STOCK_SYNC] Total lines to process: " + lines.size());
            for (LigneMouvement ligne : lines) {
                updateStockQuantity(ligne, mouvement.getTypeMouvement());
            }
        } else {
            System.err.println("[STOCK_SYNC] WARNING: No lines found for this movement!");
        }
    }
}
