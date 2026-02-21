package com.gestionStock.backend.controller.stock;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.service.stock.StockService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class StockController {

    private final StockService stockService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Stock>> getAll() {
        return ResponseEntity.ok(stockService.getAll());
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Stock>> getByType(@PathVariable TypeStock type) {
        return ResponseEntity.ok(stockService.getByType(type));
    }

    @GetMapping("/piece/{pieceId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Stock>> getByPiece(@PathVariable Long pieceId) {
        return ResponseEntity.ok(stockService.getByPiece(pieceId));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Stock>> getLowStockItems() {
        return ResponseEntity.ok(stockService.getLowStockItems());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<Stock> getById(@PathVariable Long id) {
        return ResponseEntity.ok(stockService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Stock> create(@RequestBody Stock stock) {
        return ResponseEntity.ok(stockService.save(stock));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Stock> update(@PathVariable Long id, @RequestBody Stock stock) {
        return ResponseEntity.ok(stockService.update(id, stock));
    }

    @PatchMapping("/{id}/quantity")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Stock> updateQuantity(@PathVariable Long id, @RequestParam int quantity) {
        return ResponseEntity.ok(stockService.updateQuantity(id, quantity));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        stockService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
