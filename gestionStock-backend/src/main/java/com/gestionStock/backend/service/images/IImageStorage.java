package com.gestionStock.backend.service.images;

import java.io.InputStream;
import org.springframework.web.multipart.MultipartFile;

public interface IImageStorage {
    String uploadImage(MultipartFile file) throws Exception;

    InputStream getImage(String filename) throws Exception;
}
