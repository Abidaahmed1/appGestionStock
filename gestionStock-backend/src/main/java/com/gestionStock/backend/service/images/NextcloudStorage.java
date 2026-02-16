package com.gestionStock.backend.service.images;

import com.github.sardine.Sardine;
import com.github.sardine.SardineFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "file.storage.type", havingValue = "nextcloud")
public class NextcloudStorage implements IImageStorage {

    @Value("${nextcloud.url}")
    private String nextcloudUrl;

    @Value("${nextcloud.username}")
    private String username;

    @Value("${nextcloud.password}")
    private String password;

    @Value("${nextcloud.base-path}")
    private String basePath;

    @Value("${nextcloud.documents-folder}")
    private String documentsFolder;

    @Override
    public String uploadImage(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide ou null");
        }

        Sardine sardine = SardineFactory.begin(username, password);

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg";
        String sanitizedName = originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
        String fileName = UUID.randomUUID().toString() + "_" + sanitizedName;
        String fullUrl = nextcloudUrl + basePath + "/" + documentsFolder + "/" + fileName;

        String folderUrl = nextcloudUrl + basePath + "/" + documentsFolder + "/";
        if (!sardine.exists(folderUrl)) {
            sardine.createDirectory(folderUrl);
        }

        try (InputStream is = file.getInputStream()) {
            sardine.put(fullUrl, is);
        }

        return "/api/images/" + fileName;
    }

    @Override
    public InputStream getImage(String filename) throws Exception {
        Sardine sardine = SardineFactory.begin(username, password);
        String fullUrl = nextcloudUrl + basePath + "/" + documentsFolder + "/" + filename;
        if (sardine.exists(fullUrl)) {
            return sardine.get(fullUrl);
        }
        return null;
    }
}
