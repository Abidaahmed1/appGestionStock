package com.gestionStock.backend.service.images;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

@Service
public class ImageService {

    @Autowired
    private IImageStorage storage;

    public String uploadImage(MultipartFile file) throws Exception {
        return storage.uploadImage(file);
    }

    public InputStream getImage(String filename) throws Exception {
        return storage.getImage(filename);
    }
}
