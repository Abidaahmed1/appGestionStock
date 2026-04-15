package com.gestionStock.backend.controller.piece;

import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.service.piece.ProduitFiniService;
import com.gestionStock.backend.service.images.ImageService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/produits")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ProduitFiniController {

    private final ProduitFiniService produitService;
    private final ImageService imageService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'AUDITEUR')")
    public List<ProduitFini> getAll() {
        return produitService.getAll();
    }

    @GetMapping("/archived")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'MAGASINIER')")
    public List<ProduitFini> getArchived() {
        return produitService.findArchived();
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'MAGASINIER')")
    public ResponseEntity<ProduitFini> restore(@PathVariable Long id) {
        return ResponseEntity.ok(produitService.restore(id));
    }

    @PostMapping("/upload-image/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<?> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body("Le fichier est vide");
            }
            String imageUrl = imageService.uploadImage(file);
            ProduitFini updated = produitService.updateImageUrl(id, imageUrl);
            if (updated == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors du stockage de l'image: " + e.getMessage());
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<ProduitFini> create(@Valid @RequestBody ProduitFini produit) {
        return ResponseEntity.ok(produitService.save(produit));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<ProduitFini> update(@PathVariable Long id, @Valid @RequestBody ProduitFini produit) {
        return ResponseEntity.ok(produitService.update(id, produit));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        produitService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<?> deletePermanently(@PathVariable Long id) {
        try {
            produitService.deletePermanently(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            String message = e.getMessage();
            if (e instanceof org.springframework.dao.DataIntegrityViolationException || (message != null && message.contains("constraint"))) {
                message = "Impossible de supprimer définitivement ce produit car il est lié à d'autres données (Historique, Inventaires, ou Bons). Veuillez d'abord supprimer ces liens.";
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", message != null ? message : "Erreur lors de la suppression définitive"));
        }
    }
}
