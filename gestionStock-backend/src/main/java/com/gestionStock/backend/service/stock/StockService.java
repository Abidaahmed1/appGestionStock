package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.repository.stock.StockRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
@Transactional
public class StockService {

    private final StockRepository stockRepo;

    public List<Stock> getAll() {
        return stockRepo.findAll();
    }

    public List<Stock> getByType(TypeStock type) {
        return stockRepo.findByType(type);
    }

    public List<Stock> getByPiece(Long pieceId) {
        return stockRepo.findByPieceId(pieceId);
    }

    public List<Stock> getLowStockItems() {
        return stockRepo.findLowStockItems();
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
                return stockRepo.save(s);
            }
        }
        return stockRepo.save(stock);
    }

    public Stock update(Long id, Stock stock) {
        if (!stockRepo.existsById(id)) {
            throw new EntityNotFoundException("Stock non trouvé");
        }
        stock.setId(id);
        return stockRepo.save(stock);
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
        return stockRepo.save(stock);
    }
}
