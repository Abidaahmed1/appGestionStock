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

    @GetMapping("/reference/{ref}")
    @PreAuthorize("hasAnyRole('MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR')")
    public ResponseEntity<PieceDetachee> getByReference(@PathVariable String ref) {
        PieceDetachee p = pieceService.findByReference(ref);
        if (p == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(p);
    }
}
