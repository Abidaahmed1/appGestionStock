package com.gestionStock.backend.controller.fournisseur;

import com.gestionStock.backend.entity.fournisseur.Fournisseur;

import com.gestionStock.backend.service.fournisseur.FournisseurService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fournisseurs")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class FournisseurController {

    private final FournisseurService fournisseurService;

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<List<Fournisseur>> getAll() {
        return ResponseEntity.ok(fournisseurService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public ResponseEntity<Fournisseur> getById(@PathVariable Long id) {
        return ResponseEntity.ok(fournisseurService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<?> create(@RequestBody Fournisseur fournisseur) {
        try {
            return ResponseEntity.ok(fournisseurService.save(fournisseur));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Fournisseur fournisseur) {
        try {
            return ResponseEntity.ok(fournisseurService.update(id, fournisseur));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        fournisseurService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
