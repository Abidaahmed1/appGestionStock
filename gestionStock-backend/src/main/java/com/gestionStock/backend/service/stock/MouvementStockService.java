package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.repository.stock.MouvementStockRepository;
import com.gestionStock.backend.repository.stock.StockRepository;
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
    private final StockRepository stockRepo;
    private final com.gestionStock.backend.repository.stock.BonRepository bonRepo;
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
                        if (newLine.getStock() != null && newLine.getStock().getPiece() != null) {
                            Long pieceId = newLine.getStock().getPiece().getId();

                            int originalQty = 0;
                            String pieceName = newLine.getStock().getPiece().getDesignation();

                            for (LigneMouvement originLine : bonOrigine.getMouvement().getLigneMouvement()) {
                                if (originLine.getStock() != null && originLine.getStock().getPiece() != null &&
                                        originLine.getStock().getPiece().getId().equals(pieceId)) {
                                    originalQty += originLine.getQuantite();
                                    if (pieceName == null || pieceName.isEmpty()) {
                                        pieceName = originLine.getStock().getPiece().getDesignation();
                                    }
                                }
                            }

                            if (originalQty == 0) {
                                throw new IllegalArgumentException(
                                        "La pièce '" + (pieceName != null ? pieceName : pieceId)
                                                + "' ne fait pas partie du document d'origine.");
                            }

                            int alreadyReturnedQty = 0;
                            for (com.gestionStock.backend.entity.Stock.Bon otherReturn : otherReturns) {
                                if (mouvement.getBon().getId() != null
                                        && mouvement.getBon().getId().equals(otherReturn.getId()))
                                    continue;

                                if (otherReturn.getMouvement() != null) {
                                    for (LigneMouvement existingLine : otherReturn.getMouvement().getLigneMouvement()) {
                                        if (existingLine.getStock() != null
                                                && existingLine.getStock().getPiece() != null &&
                                                existingLine.getStock().getPiece().getId().equals(pieceId)) {
                                            alreadyReturnedQty += existingLine.getQuantite();
                                        }
                                    }
                                }
                            }

                            if (alreadyReturnedQty + newLine.getQuantite() > originalQty) {
                                int remaining = originalQty - alreadyReturnedQty;
                                String finalName = pieceName != null ? pieceName : "Inconnue (ID: " + pieceId + ")";
                                throw new IllegalArgumentException("Quantité de retour excessive pour '" +
                                        finalName +
                                        "'. Reste possible : " + remaining + " (Déjà retourné : " + alreadyReturnedQty
                                        + "/" + originalQty + ").");
                            }
                        }
                    }
                }
            }

            for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
                ligne.setMouvementStock(mouvement);
                double ligneHTVA = ligne.getPrixHTVA() * ligne.getQuantite();
                double ligneTTC = ligneHTVA * (1 + ligne.getTauxTVA() / 100);
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
        if (typeMouvement == null) {
            return;
        }
        Stock incomingStock = ligne.getStock();
        if (incomingStock == null || incomingStock.getPiece() == null) {
            return;
        }

        Long pieceId = incomingStock.getPiece().getId();
        if (pieceId == null) {
            return;
        }

        Stock existingStock = null;
        if (incomingStock.getId() != null) {
            existingStock = stockRepo.findById(incomingStock.getId()).orElse(null);
        }

        if (existingStock == null) {
            if (incomingStock.getDetailPiece() != null && incomingStock.getDetailPiece().getId() != null) {
                existingStock = stockRepo.findByDetailPieceId(incomingStock.getDetailPiece().getId()).orElse(null);
            } else {
                existingStock = stockRepo.findByPieceId(pieceId).stream()
                        .filter(s -> s.getDetailPiece() == null)
                        .findFirst().orElse(null);
            }
        }

        if (existingStock == null) {
            return;
        }

        int currentQuantity = existingStock.getQuantite();
        int changeQuantity = ligne.getQuantite();

        boolean isEntry = (typeMouvement == TypeMouvement.ENTREE_RECEPTION ||
                typeMouvement == TypeMouvement.ENTREE_RETOUR);

        boolean isExit = (typeMouvement == TypeMouvement.SORTIE_VENTE ||
                typeMouvement == TypeMouvement.SORTIE_PERTE ||
                typeMouvement == TypeMouvement.SORTIE_MAINTENANCE ||
                typeMouvement == TypeMouvement.SORTIE_RETOUR);

        if (isEntry) {
            existingStock.setQuantite(currentQuantity - changeQuantity);
        } else if (isExit || typeMouvement.name().startsWith("SORTIE")) {
            existingStock.setQuantite(currentQuantity + changeQuantity);
        }

        if (existingStock.getQuantite() <= 0) {
            existingStock.setType(com.gestionStock.backend.entity.Stock.TypeStock.RUPTURE_STOCK);
        } else {
            existingStock.setType(com.gestionStock.backend.entity.Stock.TypeStock.DISPONIBLE);
        }

        stockRepo.save(existingStock);
    }

    private void updateStockQuantity(LigneMouvement ligne, TypeMouvement typeMouvement) {
        if (typeMouvement == null) {
            return;
        }
        Stock incomingStock = ligne.getStock();
        if (incomingStock == null)
            return;

        Stock existingStock = null;
        if (incomingStock.getId() != null) {
            existingStock = stockRepo.findById(incomingStock.getId()).orElse(null);
        }

        if (existingStock == null) {
            if (incomingStock.getDetailPiece() != null && incomingStock.getDetailPiece().getId() != null) {
                existingStock = stockRepo.findByDetailPieceId(incomingStock.getDetailPiece().getId()).orElse(null);
            } else if (incomingStock.getPiece() != null && incomingStock.getPiece().getId() != null) {
                existingStock = stockRepo.findByPieceId(incomingStock.getPiece().getId()).stream()
                        .filter(s -> s.getDetailPiece() == null)
                        .findFirst().orElse(null);
            }
        }

        if (existingStock == null) {
            if (incomingStock.getPiece() == null || incomingStock.getPiece().getId() == null) {
                return;
            }
            existingStock = new Stock();
            existingStock.setPiece(incomingStock.getPiece());
            existingStock.setDetailPiece(incomingStock.getDetailPiece());
            existingStock.setQuantite(0);
            existingStock.setType(com.gestionStock.backend.entity.Stock.TypeStock.DISPONIBLE);
        }

        Long pieceId = existingStock.getPiece() != null ? existingStock.getPiece().getId() : null;

        int currentQuantity = existingStock.getQuantite();
        int changeQuantity = ligne.getQuantite();

        boolean isEntry = (typeMouvement == TypeMouvement.ENTREE_RECEPTION ||
                typeMouvement == TypeMouvement.ENTREE_RETOUR);

        boolean isExit = (typeMouvement == TypeMouvement.SORTIE_VENTE ||
                typeMouvement == TypeMouvement.SORTIE_PERTE ||
                typeMouvement == TypeMouvement.SORTIE_MAINTENANCE ||
                typeMouvement == TypeMouvement.SORTIE_RETOUR);

        if (isEntry) {
            existingStock.setQuantite(currentQuantity + changeQuantity);
        } else if (isExit || typeMouvement.name().startsWith("SORTIE")) {
            int newQuantity = currentQuantity - changeQuantity;
            if (newQuantity < 0) {
                throw new IllegalStateException(
                        "Stock insuffisant pour la pièce ID " + pieceId +
                                " (disponible: " + currentQuantity + ", demandé: " + changeQuantity + ")");
            }
            existingStock.setQuantite(newQuantity);
        }

        if (existingStock.getQuantite() <= 0) {
            existingStock.setType(com.gestionStock.backend.entity.Stock.TypeStock.RUPTURE_STOCK);
        } else {
            existingStock.setType(com.gestionStock.backend.entity.Stock.TypeStock.DISPONIBLE);
        }

        ligne.setStock(stockRepo.save(existingStock));
    }

    public Stock resolveStock(Stock incoming) {
        if (incoming == null)
            return null;

        if (incoming.getId() != null) {
            Stock found = stockRepo.findById(incoming.getId()).orElse(null);
            if (found != null)
                return found;
        }

        if (incoming.getDetailPiece() != null && incoming.getDetailPiece().getId() != null) {
            Stock found = stockRepo.findByDetailPieceId(incoming.getDetailPiece().getId()).orElse(null);
            if (found != null)
                return found;
        }

        if (incoming.getPiece() != null && incoming.getPiece().getId() != null) {
            return stockRepo.findByPieceId(incoming.getPiece().getId()).stream()
                    .filter(s -> s.getDetailPiece() == null)
                    .findFirst().orElse(null);
        }

        return null;
    }

    public void updateStockForMouvement(com.gestionStock.backend.entity.Stock.MouvementStock mouvement) {
        if (mouvement == null || mouvement.getLigneMouvement() == null)
            return;

        for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
            updateStockQuantity(ligne, mouvement.getTypeMouvement());
        }
    }
}
