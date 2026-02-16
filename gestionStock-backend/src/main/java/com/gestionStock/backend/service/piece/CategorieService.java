package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class CategorieService {

    private final CategorieRepository categorieRepo;

    public List<Categorie> getAll() {
        return categorieRepo.findAll();
    }

    public Categorie create(Categorie categorie) {
        if (categorie.getCode() == null || categorie.getCode().isEmpty()) {
            categorie.setCode("CAT_" + categorie.getNom().toUpperCase().replace(" ", "_"));
        }
        return categorieRepo.save(categorie);
    }

    public Categorie findByCode(String code) {
        return categorieRepo.findByCode(code).orElse(null);
    }
}
