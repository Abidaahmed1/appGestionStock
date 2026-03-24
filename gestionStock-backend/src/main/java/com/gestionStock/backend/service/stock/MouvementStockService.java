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
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class MouvementStockService {

    private final MouvementStockRepository mouvementRepo;
    private final com.gestionStock.backend.repository.stock.BonRepository bonRepo;
    private final PieceDetacheeRepository pieceRepo;
    private final UserService userService;

    public List<MouvementStock> getAll() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            return java.util.List.of();
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

    public void rollbackStockQuantity(MouvementStock mouvement) {
        if (mouvement == null || mouvement.getLigneMouvement() == null) {
            return;
        }

        for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
            reverseUpdateStockQuantity(ligne, mouvement.getTypeMouvement());
        }
    }

    private void reverseUpdateStockQuantity(LigneMouvement ligne, TypeMouvement typeMouvement) {
        if (typeMouvement == null || ligne.getPiece() == null || ligne.getPiece().getId() == null) {
            return;
        }

        PieceDetachee piece = pieceRepo.findById(ligne.getPiece().getId()).orElse(null);
        if (piece == null) return;

        int currentQuantity = piece.getQuantite() != null ? piece.getQuantite() : 0;
        int changeQuantity = ligne.getQuantite() != null ? ligne.getQuantite() : 0;

        boolean isEntry = (typeMouvement == TypeMouvement.ENTREE_RECEPTION ||
                typeMouvement == TypeMouvement.ENTREE_RETOUR);
        boolean isExit = (typeMouvement == TypeMouvement.SORTIE_VENTE ||
                typeMouvement == TypeMouvement.SORTIE_PERTE ||
                typeMouvement == TypeMouvement.SORTIE_MAINTENANCE ||
                typeMouvement == TypeMouvement.SORTIE_RETOUR);

        if (isEntry) {
            piece.setQuantite(currentQuantity - changeQuantity);
        } else if (isExit || typeMouvement.name().startsWith("SORTIE")) {
            piece.setQuantite(currentQuantity + changeQuantity);
        }

        if (piece.getQuantite() < 0) piece.setQuantite(0);
        pieceRepo.save(piece);
    }

    private void updateStockQuantity(LigneMouvement ligne, TypeMouvement typeMouvement) {
        if (typeMouvement == null || ligne.getPiece() == null || ligne.getPiece().getId() == null) {
            return;
        }

        PieceDetachee piece = pieceRepo.findById(ligne.getPiece().getId()).orElse(null);
        if (piece == null) return;

        int currentQuantity = piece.getQuantite() != null ? piece.getQuantite() : 0;
        int changeQuantity = ligne.getQuantite() != null ? ligne.getQuantite() : 0;

        boolean isEntry = (typeMouvement == TypeMouvement.ENTREE_RECEPTION ||
                typeMouvement == TypeMouvement.ENTREE_RETOUR);
        boolean isExit = (typeMouvement == TypeMouvement.SORTIE_VENTE ||
                typeMouvement == TypeMouvement.SORTIE_PERTE ||
                typeMouvement == TypeMouvement.SORTIE_MAINTENANCE ||
                typeMouvement == TypeMouvement.SORTIE_RETOUR);

        if (isEntry) {
            piece.setQuantite(currentQuantity + changeQuantity);
        } else if (isExit || typeMouvement.name().startsWith("SORTIE")) {
            int newQuantity = currentQuantity - changeQuantity;
            if (newQuantity < 0) {
                throw new IllegalStateException(
                        "Stock insuffisant pour la pièce ID " + piece.getId() +
                                " (disponible: " + currentQuantity + ", demandé: " + changeQuantity + ")");
            }
            piece.setQuantite(newQuantity);
        }

        pieceRepo.save(piece);
        ligne.setPiece(piece);
    }

    public PieceDetachee resolvePiece(PieceDetachee incoming) {
        if (incoming == null) return null;

        if (incoming.getId() != null) {
            PieceDetachee found = pieceRepo.findById(incoming.getId()).orElse(null);
            if (found != null) return found;
        }

        String ref = incoming.getReference();
        if (ref != null && !ref.trim().isEmpty() && incoming.getEntreprise() != null) {
            PieceDetachee found = pieceRepo.findByReferenceAndEntreprise(ref, incoming.getEntreprise()).orElse(null);
            if (found != null) return found;
        }

        return null;
    }

    public void updateStockForMouvement(MouvementStock mouvement) {
        if (mouvement == null || mouvement.getLigneMouvement() == null)
            return;

        for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
            updateStockQuantity(ligne, mouvement.getTypeMouvement());
        }
    }
}
