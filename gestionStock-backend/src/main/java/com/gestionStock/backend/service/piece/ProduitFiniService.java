package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.exceptions.ProduitException;
import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.piece.ProduitFiniRepository;
import com.gestionStock.backend.service.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProduitFiniService {

    private static final Object PRODUIT_LOCK = new Object();
    private final ProduitFiniRepository produitRepo;
    private final UserService userService;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    public List<ProduitFini> getAll() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return produitRepo.findByEstArchiveeFalseAndEntreprise(entreprise);
    }

    public ProduitFini save(ProduitFini produit) {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (produit.getCode() == null || produit.getCode().trim().isEmpty()
                || "AUTO".equalsIgnoreCase(produit.getCode())) {
            synchronized (PRODUIT_LOCK) {
                produit.setCode(numerotationService.generateNextNumber("PRODUIT"));
            }
        } else {
            numerotationService.validateReference("PRODUIT", produit.getCode());
        }

        if (entreprise != null && produitRepo.existsByCodeAndEntreprise(produit.getCode(), entreprise)) {
            throw new ProduitException("Un produit avec ce code existe déjà.");
        }
        produit.setEntreprise(entreprise);
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

    @Transactional
    public void deletePermanently(Long id) {
        if (id == null) {
            throw new ProduitException("L'ID du produit est manquant.");
        }

        System.out.println("[DEBUG] Suppression définitive du produit ID: " + id);

        ProduitFini produit = produitRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Produit introuvable en base (ID: " + id + "). Veuillez actualiser."));

        // Decouple pieces to avoid constraint issues if necessary
        if (produit.getPieces() != null) {
            produit.getPieces().clear();
        }

        produitRepo.delete(produit);
        System.out.println("[DEBUG] Produit " + id + " supprimé avec succès.");
    }

    public List<ProduitFini> findArchived() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }
        return produitRepo.findByEstArchiveeTrueAndEntreprise(entreprise);
    }

    public ProduitFini restore(Long id) {
        ProduitFini produit = produitRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Produit non trouvé"));
        produit.setEstArchivee(false);
        return produitRepo.save(produit);
    }

    public ProduitFini update(Long id, ProduitFini produit) {
        ProduitFini existing = produitRepo.findById(id).orElseThrow(() -> new ProduitException("Produit non trouvé"));

        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = existing.getEntreprise();
        if (entreprise == null) {
            entreprise = userService.getCurrentUserEntreprise();
        }

        if (!existing.getCode().equals(produit.getCode())) {
            numerotationService.validateReference("PRODUIT", produit.getCode());
            if (produitRepo.existsByCodeAndEntreprise(produit.getCode(), entreprise)) {
                throw new ProduitException("Un autre produit utilise déjà ce code.");
            }
        }

        existing.setCode(produit.getCode());
        existing.setDesignation(produit.getDesignation());
        if (produit.getImageUrl() != null) {
            existing.setImageUrl(produit.getImageUrl());
        }

        // Mise à jour des pièces associées
        if (produit.getPieces() != null) {
            existing.setPieces(produit.getPieces());
        }

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
