package com.gestionStock.backend.controller.entreprise;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.service.entreprise.EntrepriseService;
import com.gestionStock.backend.service.images.ImageService;
import com.gestionStock.backend.service.user.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/entreprises")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EntrepriseController {
    private final EntrepriseService entrepriseService;
    private final ImageService imageService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Entreprise>> getAllEntreprises() {
        return ResponseEntity.ok(entrepriseService.getAllEntreprises());
    }

    @GetMapping("/current")
    public ResponseEntity<Entreprise> getCurrentUserEntreprise() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(entreprise);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Entreprise> getEntrepriseById(@PathVariable Long id) {
        return entrepriseService.getEntrepriseById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/upload-logo/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<?> uploadLogo(@PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body("Fichier vide");
            }
            String logoUrl = imageService.uploadImage(file);
            Entreprise updated = entrepriseService.updateLogoUrl(id, logoUrl);
            if (updated == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Erreur lors du stockage du logo: " + e.getMessage());
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Entreprise> createEntreprise(@RequestBody Entreprise entreprise) {
        Entreprise savedEntreprise = entrepriseService.saveEntreprise(entreprise);

        userService.getCurrentUser().ifPresent(user -> {
            if (user.getEntreprise() == null) {
                user.setEntreprise(savedEntreprise);
                userService.updateUser(user.getId(), user);
            }
        });

        return ResponseEntity.ok(savedEntreprise);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Entreprise> updateEntreprise(@PathVariable Long id, @RequestBody Entreprise entreprise) {
        entreprise.setId(id);
        return ResponseEntity.ok(entrepriseService.saveEntreprise(entreprise));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> deleteEntreprise(@PathVariable Long id) {
        entrepriseService.deleteEntreprise(id);
        return ResponseEntity.ok().build();
    }
}
