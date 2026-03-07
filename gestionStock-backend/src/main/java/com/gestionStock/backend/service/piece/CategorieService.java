package com.gestionStock.backend.service.piece;

import java.util.List;

import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.piece.Categorie;
import com.gestionStock.backend.repository.piece.CategorieRepository;
import com.gestionStock.backend.service.user.UserService;

import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional
public class CategorieService {

    private final CategorieRepository categorieRepo;
    private final UserService userService;

    public List<Categorie> getAll() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            // Aucun utilisateur ou aucune entreprise associée : retourner une liste vide
            return java.util.List.of();
        }
        return categorieRepo.findByArchiveeFalseAndEntreprise(entreprise);
    }

    public Categorie create(Categorie categorie) {
        if (categorie.getCode() == null || categorie.getCode().isEmpty()) {
            categorie.setCode("CAT_" + categorie.getNom().toUpperCase().replace(" ", "_"));
        }
        categorie.setEntreprise(userService.getCurrentUserEntreprise());
        return categorieRepo.save(categorie);
    }

    public Categorie findByCode(String code) {
        return categorieRepo.findByCode(code).orElse(null);
    }
}
