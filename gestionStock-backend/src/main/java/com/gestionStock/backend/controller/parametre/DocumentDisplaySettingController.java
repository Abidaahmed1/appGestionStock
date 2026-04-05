package com.gestionStock.backend.controller.parametre;

import com.gestionStock.backend.entity.parametre.DocumentDisplaySetting;
import com.gestionStock.backend.entity.parametre.DocumentType;
import com.gestionStock.backend.service.parametre.DocumentDisplaySettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/config/documents")
@RequiredArgsConstructor
public class DocumentDisplaySettingController {

    private final DocumentDisplaySettingService service;

    @GetMapping
    public ResponseEntity<List<DocumentDisplaySetting>> getAllSettings() {
        return ResponseEntity.ok(service.getAllSettingsForCurrentEntreprise());
    }

    @GetMapping("/{type}")
    public ResponseEntity<DocumentDisplaySetting> getSettingByType(@PathVariable DocumentType type) {
        return ResponseEntity.ok(service.getOrCreateSettingByType(type));
    }

    @PostMapping
    public ResponseEntity<DocumentDisplaySetting> saveSetting(@RequestBody DocumentDisplaySetting setting) {
        return ResponseEntity.ok(service.saveSetting(setting));
    }
}
