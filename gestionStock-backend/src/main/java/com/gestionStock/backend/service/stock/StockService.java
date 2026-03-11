package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.repository.stock.StockRepository;
import com.gestionStock.backend.entity.notification.NotificationType;
import com.gestionStock.backend.service.notification.NotificationService;
import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.service.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class StockService {

    private final StockRepository stockRepo;
    private final NotificationService notificationService;
    private final UserService userService;

    public List<Stock> getAll() {
        return stockRepo.findByPieceEntreprise(userService.getCurrentUserEntreprise());
    }

    public List<Stock> getByType(TypeStock type) {
        return stockRepo.findByTypeAndPieceEntreprise(type, userService.getCurrentUserEntreprise());
    }

    public List<Stock> getByPiece(Long pieceId) {
        return stockRepo.findByPieceId(pieceId);
    }

    public List<Stock> getLowStockItems() {
        return stockRepo.findLowStockItemsByEntreprise(userService.getCurrentUserEntreprise());
    }

    public Stock getById(Long id) {
        return stockRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock non trouvé"));
    }

    public Stock save(Stock stock) {
        if (stock.getPiece() != null) {
            List<Stock> existingList = stockRepo.findByPieceId(stock.getPiece().getId());

            if (!existingList.isEmpty()) {
                Stock s = existingList.get(0);
                s.setQuantite(s.getQuantite() + stock.getQuantite());
                if (stock.getType() != null) {
                    s.setType(stock.getType());
                }
                Stock saved = stockRepo.save(s);
                checkStockAndNotify(saved);
                return saved;
            }
        }
        Stock saved = stockRepo.save(stock);
        checkStockAndNotify(saved);
        return saved;
    }

    public Stock update(Long id, Stock stock) {
        if (!stockRepo.existsById(id)) {
            throw new EntityNotFoundException("Stock non trouvé");
        }
        stock.setId(id);
        Stock saved = stockRepo.save(stock);
        checkStockAndNotify(saved);
        return saved;
    }

    public void delete(Long id) {
        if (!stockRepo.existsById(id)) {
            throw new EntityNotFoundException("Stock non trouvé");
        }
        stockRepo.deleteById(id);
    }

    public Stock updateQuantity(Long id, int newQuantity) {
        Stock stock = getById(id);
        stock.setQuantite(newQuantity);
        Stock saved = stockRepo.save(stock);
        checkStockAndNotify(saved);
        return saved;
    }

    private void checkStockAndNotify(Stock stock) {
        if (stock.getPiece() == null)
            return;

        int qte = stock.getQuantite();
        int min = stock.getPiece().getSeuilMinimum();
        String designation = stock.getPiece().getDesignation();
        TypeStock previousType = stock.getType();

        if (qte == 0) {
            stock.setType(TypeStock.RUPTURE_STOCK);
            if (previousType != TypeStock.RUPTURE_STOCK) {
                String msg = "Rupture de stock totale pour : " + designation;
                notificationService.createNotificationForRoles("RUPTURE DE STOCK", msg, NotificationType.RUPTURE_STOCK,
                        List.of(Role.RESPONSABLE_LOGISTIQUE, Role.AUDITEUR, Role.MAGASINIER), stock.getId());
                stockRepo.save(stock);
            }
        } else if (qte <= min) {
            stock.setType(TypeStock.RESERVE);
            if (previousType != TypeStock.RESERVE) {
                String msg = "Niveau de stock critique pour : " + designation + " (" + qte + " restants)";
                notificationService.createNotificationForRoles("STOCK CRITIQUE", msg, NotificationType.WARNING,
                        List.of(Role.RESPONSABLE_LOGISTIQUE, Role.AUDITEUR, Role.MAGASINIER), stock.getId());
                stockRepo.save(stock);
            }
        } else {
            stock.setType(TypeStock.DISPONIBLE);
            if (previousType != TypeStock.DISPONIBLE) {
                stockRepo.save(stock);
            }
        }
    }
}
