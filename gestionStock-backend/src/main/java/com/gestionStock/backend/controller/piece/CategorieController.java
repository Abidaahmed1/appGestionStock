package com.gestionStock.backend.controller.piece;

import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.service.piece.CategorieService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CategorieController {

    private final CategorieService categorieService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'MAGASINIER')")
    public List<Categorie> getAll() {
        return categorieService.getAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('MAGASINIER')")
    public ResponseEntity<Categorie> create(@RequestBody Categorie categorie) {
        return ResponseEntity.ok(categorieService.create(categorie));
    }
}
