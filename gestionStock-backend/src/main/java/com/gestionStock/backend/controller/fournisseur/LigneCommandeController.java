package com.gestionStock.backend.controller.fournisseur;

import com.gestionStock.backend.entity.fournisseur.LigneCommande;
import com.gestionStock.backend.service.fournisseur.LigneCommandeService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lignes-commandes")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class LigneCommandeController {

    private final LigneCommandeService service;

    @GetMapping("/commande/{bonCommandeId}")
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER')")
    public List<LigneCommande> getByCommande(@PathVariable Long bonCommandeId) {
        return service.getByBonCommande(bonCommandeId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<LigneCommande> create(@RequestBody LigneCommande ligne) {
        return ResponseEntity.ok(service.save(ligne));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole( 'RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
