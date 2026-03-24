package com.gestionStock.backend.controller.parametre;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.gestionStock.backend.entity.parametre.NumerotationConfig;
import com.gestionStock.backend.entity.parametre.Parametre;
import com.gestionStock.backend.entity.parametre.ParametreService;
import com.gestionStock.backend.entity.parametre.TypeChamp;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/parametres")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ParametreController {

    private final ParametreService parametreService;

    @GetMapping
    public ResponseEntity<List<Parametre>> getAllParametres() {
        return ResponseEntity.ok(parametreService.getAllParametres());
    }

    @GetMapping("/current")
    public ResponseEntity<List<Parametre>> getCurrentParametres() {
        return ResponseEntity.ok(parametreService.getCurrentParametres());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Parametre> getParametreById(@PathVariable Long id) {
        return parametreService.getParametreById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/entreprise/{entrepriseId}")
    public ResponseEntity<List<Parametre>> getParametresByEntrepriseId(@PathVariable Long entrepriseId) {
        return ResponseEntity.ok(parametreService.getParametresByEntrepriseId(entrepriseId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Parametre> createParametre(@RequestBody Parametre parametre) {
        Parametre savedParametre = parametreService.createParametre(parametre);
        return ResponseEntity.ok(savedParametre);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Parametre> updateParametre(@PathVariable Long id, @RequestBody Parametre parametre) {
        try {
            Parametre updatedParametre = parametreService.updateParametre(id, parametre);
            return ResponseEntity.ok(updatedParametre);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/bulk")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<List<Parametre>> saveAllParametres(@RequestBody List<Parametre> parametres) {
        return ResponseEntity.ok(parametreService.updateParametres(parametres));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> deleteParametre(@PathVariable Long id) {
        parametreService.deleteParametre(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/types-champs")
    public ResponseEntity<List<TypeChamp>> getTypesChampsDisponibles() {
        return ResponseEntity.ok(parametreService.getTypesChampsDisponibles());
    }

    @PostMapping("/valider-valeur")
    public ResponseEntity<Boolean> validerValeurParametre(
            @RequestBody Long parametreId,
            @RequestParam String valeur) {
        return parametreService.getParametreById(parametreId)
                .map(p -> ResponseEntity.ok(parametreService.validerValeurParametre(p, valeur)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/numerotation")
    public ResponseEntity<List<NumerotationConfig>> getNumerotationConfigs() {
        return ResponseEntity.ok(parametreService.getNumerotationConfigs());
    }

    @PutMapping("/{parametreId}/numerotation")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Parametre> updateNumerotationConfigs(
            @PathVariable Long parametreId,
            @RequestBody List<NumerotationConfig> configs) {
        try {
            Parametre updatedParametre = parametreService.updateNumerotationConfigs(parametreId, configs);
            return ResponseEntity.ok(updatedParametre);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
