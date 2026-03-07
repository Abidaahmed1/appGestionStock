package com.gestionStock.backend.controller.parametre;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.gestionStock.backend.entity.parametre.ChampPersonnalise;
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

    @GetMapping("/{id}")
    public ResponseEntity<Parametre> getParametreById(@PathVariable Long id) {
        return parametreService.getParametreById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/entreprise/{entrepriseId}")
    public ResponseEntity<Parametre> getParametreByEntrepriseId(@PathVariable Long entrepriseId) {
        return parametreService.getParametreByEntrepriseId(entrepriseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> deleteParametre(@PathVariable Long id) {
        parametreService.deleteParametre(id);
        return ResponseEntity.ok().build();
    }

    // Gestion des champs personnalisés
    @PostMapping("/{parametreId}/champs")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Parametre> ajouterChampPersonnalise(
            @PathVariable Long parametreId,
            @RequestBody ChampPersonnalise champ) {
        try {
            Parametre updatedParametre = parametreService.ajouterChampPersonnalise(parametreId, champ);
            return ResponseEntity.ok(updatedParametre);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{parametreId}/champs/{nomChamp}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Parametre> modifierChampPersonnalise(
            @PathVariable Long parametreId,
            @PathVariable String nomChamp,
            @RequestBody ChampPersonnalise champ) {
        try {
            Parametre updatedParametre = parametreService.modifierChampPersonnalise(parametreId, nomChamp, champ);
            return ResponseEntity.ok(updatedParametre);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{parametreId}/champs/{nomChamp}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Parametre> supprimerChampPersonnalise(
            @PathVariable Long parametreId,
            @PathVariable String nomChamp) {
        try {
            Parametre updatedParametre = parametreService.supprimerChampPersonnalise(parametreId, nomChamp);
            return ResponseEntity.ok(updatedParametre);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/types-champs")
    public ResponseEntity<List<TypeChamp>> getTypesChampsDisponibles() {
        return ResponseEntity.ok(parametreService.getTypesChampsDisponibles());
    }

    @PostMapping("/valider-champ")
    public ResponseEntity<Boolean> validerValeurChamp(
            @RequestBody ChampPersonnalise champ,
            @RequestParam String valeur) {
        boolean isValid = parametreService.validerValeurChamp(champ, valeur);
        return ResponseEntity.ok(isValid);
    }
}
