package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.repository.stock.MouvementStockRepository;
import com.gestionStock.backend.repository.stock.StockRepository;
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

    public List<MouvementStock> getAll() {
        return mouvementRepo.findAll();
    }

    public MouvementStock getById(Long id) {
        return mouvementRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mouvement non trouvé"));
    }

    public List<MouvementStock> getByType(TypeMouvement typeMouvement) {
        return mouvementRepo.findByTypeMouvement(typeMouvement);
    }

    public List<MouvementStock> getByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return mouvementRepo.findByDateBetween(startDate, endDate);
    }

    public MouvementStock save(MouvementStock mouvement) {
        if (mouvement.getDate() == null) {
            mouvement.setDate(LocalDateTime.now());
        }

        // Calculate totals from ligne mouvements
        double totalHTVA = 0;
        double totalTTC = 0;

        if (mouvement.getLigneMouvement() != null) {
            for (LigneMouvement ligne : mouvement.getLigneMouvement()) {
                ligne.setMouvementStock(mouvement);
                double ligneHTVA = ligne.getPrixHTVA() * ligne.getQuantite();
                double ligneTTC = ligneHTVA * (1 + ligne.getTauxTVA() / 100);
                totalHTVA += ligneHTVA;
                totalTTC += ligneTTC;

                // Update stock quantities based on movement type
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
        if (!mouvementRepo.existsById(id)) {
            throw new EntityNotFoundException("Mouvement non trouvé");
        }
        mouvementRepo.deleteById(id);
    }

    private void updateStockQuantity(LigneMouvement ligne, TypeMouvement typeMouvement) {
        Stock stock = ligne.getStock();
        if (stock == null)
            return;

        int currentQuantity = stock.getQuantite();
        int changeQuantity = ligne.getQuantite();

        // Determine if this is an entry or exit movement
        boolean isEntry = typeMouvement.name().startsWith("ENTREE");

        if (isEntry) {
            stock.setQuantite(currentQuantity + changeQuantity);
        } else {
            stock.setQuantite(currentQuantity - changeQuantity);
        }

        stockRepo.save(stock);
    }
}
