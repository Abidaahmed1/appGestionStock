package com.gestionStock.backend.controller.stock;

import com.gestionStock.backend.entity.Stock.Bon;
import com.gestionStock.backend.entity.Stock.TypeBon;
import com.gestionStock.backend.service.stock.BonService;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bons")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class BonController {

    private final BonService bonService;

    @GetMapping
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Bon>> getAll() {
        return ResponseEntity.ok(bonService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<Bon> getById(@PathVariable Long id) {
        return ResponseEntity.ok(bonService.getById(id));
    }

    @GetMapping("/type/{typeBon}")
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Bon>> getByType(@PathVariable TypeBon typeBon) {
        return ResponseEntity.ok(bonService.getByType(typeBon));
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Bon>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(bonService.getByDateRange(startDate, endDate));
    }

    @PostMapping
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<?> create(@RequestBody Bon bon) {
        try {
            return ResponseEntity.ok(bonService.save(bon));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Bon bon) {
        try {
            return ResponseEntity.ok(bonService.update(id, bon));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bonService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
