package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.entity.piece.ProduitFini;
import com.gestionStock.backend.repository.piece.ProduitFiniRepository;

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

    public List<ProduitFini> getAll() {
        return produitRepo.findByEstArchiveeFalse();
    }

    public ProduitFini save(ProduitFini produit) {
        return produitRepo.save(produit);
    }

    public void delete(Long id) {
        ProduitFini produit = produitRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Produit non trouvé"));

        if (!produit.getPieces().isEmpty()) {
            throw new IllegalStateException(
                    "Impossible de supprimer ce produit car il est associé à des pièces détachées.");
        }

        produit.setEstArchivee(true);
        produitRepo.save(produit);
    }

    public ProduitFini update(Long id, ProduitFini produit) {
        if (produitRepo.existsById(id)) {
            produit.setId(id);
            return produitRepo.save(produit);
        }
        return null;
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
