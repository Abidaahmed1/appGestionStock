package com.gestionStock.backend.controller;

import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.service.piece.ProduitFiniService;
import com.gestionStock.backend.service.images.ImageService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/produits")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ProduitFiniController {

    private final ProduitFiniService produitService;
    private final ImageService imageService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'MAGASINIER')")
    public List<ProduitFini> getAll() {
        return produitService.getAll();
    }

    @PostMapping("/upload-image/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
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
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<ProduitFini> create(@RequestBody ProduitFini produit) {
        return ResponseEntity.ok(produitService.save(produit));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<ProduitFini> update(@PathVariable Long id, @RequestBody ProduitFini produit) {
        return ResponseEntity.ok(produitService.update(id, produit));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        produitService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
