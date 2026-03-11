package com.gestionStock.backend.service.piece;

import java.util.List;

import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import com.gestionStock.backend.service.user.UserService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class CategorieService {

    private static final Object CATEGORIE_LOCK = new Object();

    private final CategorieRepository categorieRepo;
    private final UserService userService;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    public List<Categorie> getAll() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return categorieRepo.findByArchiveeFalseAndEntreprise(entreprise);
    }

    public Categorie create(Categorie categorie) {
        if (categorie.getCode() == null || categorie.getCode().trim().isEmpty()
                || "AUTO".equalsIgnoreCase(categorie.getCode())) {
            synchronized (CATEGORIE_LOCK) {
                categorie.setCode(numerotationService.generateNextNumber("CATEGORIE"));
            }
        } else {
            numerotationService.validateReference("CATEGORIE", categorie.getCode());
        }
        categorie.setEntreprise(userService.getCurrentUserEntreprise());
        return categorieRepo.save(categorie);
    }

    public Categorie findByCode(String code) {
        return categorieRepo.findByCode(code).orElse(null);
    }
}
