package com.gestionStock.backend.controller.stock;

import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.service.stock.MouvementStockService;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/mouvements")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class MouvementStockController {

    private final MouvementStockService mouvementService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MAGASINIER', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<List<MouvementStock>> getAll() {
        return ResponseEntity.ok(mouvementService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<MouvementStock> getById(@PathVariable Long id) {
        return ResponseEntity.ok(mouvementService.getById(id));
    }

    @GetMapping("/type/{typeMouvement}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<List<MouvementStock>> getByType(@PathVariable TypeMouvement typeMouvement) {
        return ResponseEntity.ok(mouvementService.getByType(typeMouvement));
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<List<MouvementStock>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(mouvementService.getByDateRange(startDate, endDate));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<MouvementStock> create(@RequestBody MouvementStock mouvement) {
        return ResponseEntity.ok(mouvementService.save(mouvement));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<MouvementStock> update(@PathVariable Long id, @RequestBody MouvementStock mouvement) {
        return ResponseEntity.ok(mouvementService.update(id, mouvement));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        mouvementService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
