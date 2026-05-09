package com.gestionStock.backend.service.piece;

import java.util.List;

import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import com.gestionStock.backend.service.user.UserService;

import org.springframework.transaction.annotation.Transactional;
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
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        
        List<Categorie> allCats = categorieRepo.findByEntreprise(entreprise);
        Categorie existing = allCats.stream()
                .filter(c -> c.getNom().equalsIgnoreCase(categorie.getNom()))
                .findFirst()
                .orElse(null);

        if (existing != null) {
            if (Boolean.TRUE.equals(existing.isArchivee())) {
                existing.setArchivee(false);
                return categorieRepo.save(existing);
            }
            throw new com.gestionStock.backend.exceptions.PieceException("La catégorie '" + categorie.getNom() + "' existe déjà.");
        }

        if (categorie.getCode() == null || categorie.getCode().trim().isEmpty()
                || "AUTO".equalsIgnoreCase(categorie.getCode())) {
            synchronized (CATEGORIE_LOCK) {
                String nextCode;
                do {
                    nextCode = numerotationService.generateNextNumber("CATEGORIE");
                } while (categorieRepo.findByCode(nextCode).isPresent());
                categorie.setCode(nextCode);
            }
        } else {
            numerotationService.validateReference("CATEGORIE", categorie.getCode());
        }
        if (categorie.getArchivee() == null) {
            categorie.setArchivee(false);
        }
        categorie.setEntreprise(entreprise);
        return categorieRepo.save(categorie);
    }

    public Categorie findByCode(String code) {
        return categorieRepo.findByCode(code).orElse(null);
    }
}
