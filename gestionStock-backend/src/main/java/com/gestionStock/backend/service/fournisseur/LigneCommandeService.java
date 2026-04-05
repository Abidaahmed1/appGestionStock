package com.gestionStock.backend.service.fournisseur;

import com.gestionStock.backend.entity.fournisseur.LigneCommande;
import com.gestionStock.backend.repository.fournisseur.LigneCommandeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class LigneCommandeService {

    private final LigneCommandeRepository repository;

    public List<LigneCommande> getByBonCommande(Long bonCommandeId) {
        return repository.findByBonCommandeFournisseurId(bonCommandeId);
    }

    public LigneCommande save(LigneCommande ligne) {
        return repository.save(ligne);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Ligne de commande non trouvée");
        }
        repository.deleteById(id);
    }
}
