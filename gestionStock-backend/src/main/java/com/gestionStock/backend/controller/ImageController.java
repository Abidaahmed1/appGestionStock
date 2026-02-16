package com.gestionStock.backend.controller;

import com.gestionStock.backend.service.images.ImageService;
import lombok.AllArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.URLConnection;

@RestController
@RequestMapping("/api/images")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ImageController {

    private final ImageService imageService;

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> getImage(@PathVariable String filename) {
        try {
            InputStream is = imageService.getImage(filename);
            if (is == null) {
                return ResponseEntity.notFound().build();
            }

            // Essayer de deviner le type de contenu
            String contentType = URLConnection.guessContentTypeFromName(filename);
            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(new InputStreamResource(is));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
