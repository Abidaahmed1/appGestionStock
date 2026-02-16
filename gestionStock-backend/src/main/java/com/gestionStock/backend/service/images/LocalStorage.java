package com.gestionStock.backend.service.images;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "file.storage.type", havingValue = "local")
public class LocalStorage implements IImageStorage {

    @Value("${file.local.upload-dir:uploads}")
    private String uploadDir;

    @Value("${server.port:8081}")
    private String serverPort;

    @Override
    public String uploadImage(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide ou null");
        }

        Path root = Paths.get(uploadDir);
        if (!Files.exists(root)) {
            Files.createDirectories(root);
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg";
        String sanitizedName = originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
        String fileName = UUID.randomUUID().toString() + "_" + sanitizedName;
        Path targetPath = root.resolve(fileName);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return "/api/images/" + fileName;
    }

    @Override
    public java.io.InputStream getImage(String filename) throws Exception {
        Path root = Paths.get(uploadDir);
        Path targetPath = root.resolve(filename);
        if (Files.exists(targetPath)) {
            return Files.newInputStream(targetPath);
        }
        return null;
    }
}
