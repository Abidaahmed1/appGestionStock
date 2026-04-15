package com.gestionStock.backend.service.fournisseur;

import com.gestionStock.backend.entity.fournisseur.Fournisseur;
import com.gestionStock.backend.repository.fournisseur.FournisseurRepository;
import com.gestionStock.backend.service.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class FournisseurService {

    private static final Object FOURNISSEUR_LOCK = new Object();
    private final FournisseurRepository fournisseurRepo;
    private final UserService userService;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    public List<Fournisseur> getAll() {
        return fournisseurRepo.findByArchiveeFalseAndEntreprise(userService.getCurrentUserEntreprise());
    }

    public Fournisseur getById(Long id) {
        return fournisseurRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Fournisseur non trouvé"));
    }

    public Fournisseur save(Fournisseur fournisseur) {
        if (fournisseur.getId() == null) {
            if (fournisseur.getCode() == null || fournisseur.getCode().isEmpty()
                    || "AUTO".equalsIgnoreCase(fournisseur.getCode())) {
                synchronized (FOURNISSEUR_LOCK) {
                    fournisseur.setCode(numerotationService.generateNextNumber("FOURNISSEUR"));
                }
            } else {
                numerotationService.validateReference("FOURNISSEUR", fournisseur.getCode());
                if (fournisseurRepo.existsByCode(fournisseur.getCode())) {
                    throw new IllegalStateException("Un fournisseur avec ce code existe déjà");
                }
            }

            if (fournisseurRepo.existsByEmail(fournisseur.getEmail())) {
                throw new IllegalStateException("Un fournisseur avec cet email existe déjà");
            }
        }
        fournisseur.setEntreprise(userService.getCurrentUserEntreprise());
        return fournisseurRepo.save(fournisseur);
    }

    public Fournisseur update(Long id, Fournisseur fournisseur) {
        Fournisseur existing = getById(id);

        if (!existing.getCode().equals(fournisseur.getCode())) {
            numerotationService.validateReference("FOURNISSEUR", fournisseur.getCode());
            if (fournisseurRepo.existsByCode(fournisseur.getCode())) {
                throw new IllegalStateException("Un autre fournisseur utilise déjà ce code");
            }
        }

        fournisseur.setId(id);
        return fournisseurRepo.save(fournisseur);
    }

    public void delete(Long id) {
        Fournisseur fournisseur = getById(id);
        fournisseur.setArchivee(true);
        fournisseurRepo.save(fournisseur);
    }

    public List<Fournisseur> findArchived() {
        return fournisseurRepo.findByArchiveeTrueAndEntreprise(userService.getCurrentUserEntreprise());
    }

    public Fournisseur restore(Long id) {
        Fournisseur f = getById(id);
        f.setArchivee(false);
        return fournisseurRepo.save(f);
    }

    public void deletePermanently(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("L'ID est manquant.");
        }
        System.out.println("[DEBUG] Suppression définitive du fournisseur ID: " + id);
        Fournisseur f = getById(id);

        try {
            fournisseurRepo.delete(f);
            fournisseurRepo.flush();
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalStateException(
                    "Ce fournisseur ne peut pas être supprimé définitivement car il est encore associé à des pièces dans le catalogue . ");
        }
    }
}
