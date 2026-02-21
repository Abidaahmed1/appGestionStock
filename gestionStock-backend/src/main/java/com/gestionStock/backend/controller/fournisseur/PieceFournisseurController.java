package com.gestionStock.backend.controller.fournisseur;

import com.gestionStock.backend.entity.fournisseur.PieceFournisseur;
import com.gestionStock.backend.service.fournisseur.PieceFournisseurService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/piece-fournisseur")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PieceFournisseurController {

    private final PieceFournisseurService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE')")
    public List<PieceFournisseur> getAll() {
        return service.getAll();
    }

    @GetMapping("/fournisseur/{fournisseurId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE')")
    public List<PieceFournisseur> getByFournisseur(@PathVariable Long fournisseurId) {
        return service.getByFournisseur(fournisseurId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<PieceFournisseur> save(@RequestBody PieceFournisseur pieceFournisseur) {
        return ResponseEntity.ok(service.save(pieceFournisseur));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
