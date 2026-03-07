package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.exceptions.ProduitException;

import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.piece.ProduitFiniRepository;
import com.gestionStock.backend.service.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class ProduitFiniService {

    private final ProduitFiniRepository produitRepo;
    private final UserService userService;

    public List<ProduitFini> getAll() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            // Aucun utilisateur ou aucune entreprise associée : retourner une liste vide
            return java.util.List.of();
        }
        return produitRepo.findByEstArchiveeFalseAndEntreprise(entreprise);
    }

    public ProduitFini save(ProduitFini produit) {
        if (produitRepo.existsByCode(produit.getCode())) {
            throw new ProduitException("Un produit avec ce code existe déjà.");
        }
        produit.setEntreprise(userService.getCurrentUserEntreprise());
        return produitRepo.save(produit);
    }

    public void delete(Long id) {
        ProduitFini produit = produitRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Produit non trouvé"));

        boolean allPiecesArchived = produit.getPieces().isEmpty() ||
                produit.getPieces().stream().allMatch(PieceDetachee::isArchivee);

        if (!allPiecesArchived) {
            throw new ProduitException(
                    "Impossible d'archiver ce produit car il possède des pièces associées qui ne sont pas encore archivées.");
        }

        produit.setEstArchivee(true);
        produitRepo.save(produit);
    }

    public ProduitFini update(Long id, ProduitFini produit) {
        ProduitFini existing = produitRepo.findById(id).orElseThrow(() -> new ProduitException("Produit non trouvé"));

        if (!existing.getCode().equals(produit.getCode()) && produitRepo.existsByCode(produit.getCode())) {
            throw new ProduitException("Un autre produit utilise déjà ce code.");
        }

        existing.setCode(produit.getCode());
        existing.setDesignation(produit.getDesignation());
        if (produit.getImageUrl() != null) {
            existing.setImageUrl(produit.getImageUrl());
        }

        // Ensure enterprise is kept!
        if (existing.getEntreprise() == null) {
            existing.setEntreprise(userService.getCurrentUserEntreprise());
        }

        return produitRepo.save(existing);
    }

    public ProduitFini updateImageUrl(Long id, String imageUrl) {
        return produitRepo.findById(id)
                .map(p -> {
                    p.setImageUrl(imageUrl);
                    return produitRepo.save(p);
                })
                .orElse(null);
    }
}
