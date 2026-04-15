package com.gestionStock.backend.controller.fournisseur;

import com.gestionStock.backend.entity.fournisseur.BonCommandeFournisseur;
import com.gestionStock.backend.service.fournisseur.BonCommandeFournisseurService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/commandes-fournisseurs")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class BonCommandeFournisseurController {

    private final BonCommandeFournisseurService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR')")
    public List<BonCommandeFournisseur> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<BonCommandeFournisseur> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR')")
    public ResponseEntity<BonCommandeFournisseur> create(@Valid @RequestBody BonCommandeFournisseur bon) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(bon));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR')")
    public ResponseEntity<BonCommandeFournisseur> update(@PathVariable Long id,
            @Valid @RequestBody BonCommandeFournisseur bon) {
        return ResponseEntity.ok(service.update(id, bon));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> deletePermanently(@PathVariable Long id) {
        service.deletePermanently(id);
        return ResponseEntity.noContent().build();
    }
}
