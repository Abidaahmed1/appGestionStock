package com.gestionStock.backend.controller.entreprise;

import com.gestionStock.backend.entity.entreprise.Devise;
import com.gestionStock.backend.entity.entreprise.Pays;
import com.gestionStock.backend.service.entreprise.MetadataInitializationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metadata")
@RequiredArgsConstructor
public class MetadataController {
    private final MetadataInitializationService metadataService;

    @GetMapping("/pays")
    public ResponseEntity<List<Pays>> getAllPays() {
        return ResponseEntity.ok(metadataService.getAllPays());
    }

    @GetMapping("/devises")
    public ResponseEntity<List<Devise>> getAllDevises() {
        return ResponseEntity.ok(metadataService.getAllDevises());
    }

    @PostMapping("/init")
    public ResponseEntity<String> reinitializeMetadata() {
        metadataService.init();
        return ResponseEntity.ok("Initialization complete");
    }
}
