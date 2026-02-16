package com.gestionStock.backend.controller;

import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.service.piece.PieceDetacheeService;
import com.gestionStock.backend.service.images.ImageService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/pieces")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PieceDetacheeController {

    private final PieceDetacheeService pieceService;
    private final ImageService imageService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'MAGASINIER')")
    public List<PieceDetachee> getAll() {
        return pieceService.findByActive();
    }

    @PostMapping("/upload-image/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
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
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors du stockage de l'image: " + e.getMessage());
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<PieceDetachee> create(@RequestBody PieceDetachee piece) {
        PieceDetachee saved = pieceService.addPiece(piece);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<PieceDetachee> update(@PathVariable Long id, @RequestBody PieceDetachee piece) {
        return ResponseEntity.ok(pieceService.update(id, piece));
    }

    @DeleteMapping("/{codeBarre}")
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Void> delete(@PathVariable String codeBarre) {
        pieceService.delete(codeBarre);
        return ResponseEntity.noContent().build();
    }
}
