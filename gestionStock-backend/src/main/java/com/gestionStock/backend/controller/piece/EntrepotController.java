package com.gestionStock.backend.controller.piece;

import com.gestionStock.backend.entity.piece.Entrepot;
import com.gestionStock.backend.service.piece.EntrepotService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/entrepots")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class EntrepotController {

    private final EntrepotService entrepotService;

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE')")
    public List<Entrepot> getAll() {
        return entrepotService.getAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<Entrepot> create(@RequestBody Entrepot entrepot) {
        return ResponseEntity.ok(entrepotService.create(entrepot));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<Entrepot> update(@PathVariable Long id, @RequestBody Entrepot entrepot) {
        return ResponseEntity.ok(entrepotService.update(id, entrepot));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        entrepotService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
