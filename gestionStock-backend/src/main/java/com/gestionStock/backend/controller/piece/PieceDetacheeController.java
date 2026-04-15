package com.gestionStock.backend.controller.piece;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.service.piece.PieceDetacheeService;
import com.gestionStock.backend.service.images.ImageService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/pieces")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PieceDetacheeController {

    private final PieceDetacheeService pieceService;
    private final ImageService imageService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR')")
    public List<PieceDetachee> getAll() {
        return pieceService.findByActive();
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR')")
    public List<PieceDetachee> getLowStock() {
        return pieceService.findLowStockPieces();
    }

    @GetMapping("/archived")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public List<PieceDetachee> getArchived() {
        return pieceService.findArchived();
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<PieceDetachee> restore(@PathVariable Long id) {
        PieceDetachee restored = pieceService.restore(id);
        if (restored == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(restored);
    }

    @PostMapping("/upload-image-front/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<?> uploadImageFront(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return uploadImage(id, file); // Alias for consistency via internal call
    }

    @PostMapping("/upload-image/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<?> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body("Fichier vide");
            }
            String imageUrl = imageService.uploadImage(file);
            PieceDetachee updated = pieceService.updateImageUrl(id, imageUrl);
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
    public ResponseEntity<PieceDetachee> create(@Valid @RequestBody PieceDetachee piece) {
        PieceDetachee saved = pieceService.addPiece(piece);
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/quantity")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE')")
    public ResponseEntity<PieceDetachee> updateQuantity(@PathVariable Long id,
            @RequestParam("quantity") Integer quantity) {
        return ResponseEntity.ok(pieceService.updateQuantity(id, quantity));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<PieceDetachee> update(@PathVariable Long id, @Valid @RequestBody PieceDetachee piece) {
        return ResponseEntity.ok(pieceService.update(id, piece));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'ADMINISTRATEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            pieceService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            String message = e.getMessage();
            if (e instanceof org.springframework.dao.DataIntegrityViolationException) {
                message = "Impossible de supprimer cet élément car il est utilisé dans d'autres parties du système (historique, bons, etc.).";
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", message != null ? message : "Erreur lors de la suppression"));
        }
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<?> deletePermanently(@PathVariable Long id) {
        try {
            pieceService.deletePermanently(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            String message = e.getMessage();
            // Si c'est déjà une PieceException personnalisée venant du service, on garde son message
            if (e instanceof com.gestionStock.backend.exceptions.PieceException) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                        .body(java.util.Map.of("message", message));
            }
            // Sinon, on traite les violations d'intégrité génériques
            if (e instanceof org.springframework.dao.DataIntegrityViolationException || (message != null && (message.contains("constraint") || message.contains("referenced")))) {
                message = "Impossible de supprimer définitivement cette pièce car elle est liée à d'autres données (Fournisseurs, Historique ou Inventaires).";
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", message != null ? message : "Erreur lors de la suppression définitive"));
        }
    }

    @GetMapping("/reference/{ref}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<PieceDetachee> getByReference(@PathVariable String ref) {
        PieceDetachee p = pieceService.findByReference(ref);
        if (p == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(p);
    }
}
