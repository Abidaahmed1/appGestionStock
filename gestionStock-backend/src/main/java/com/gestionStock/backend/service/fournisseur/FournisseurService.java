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
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (fournisseur.getId() == null) {
            // 1. Vérification de l'unicité du NOM dans l'entreprise
            if (fournisseurRepo.existsByNomAndEntreprise(fournisseur.getNom(), entreprise)) {
                throw new IllegalStateException("Un fournisseur avec ce nom existe déjà");
            }

            // 2. Gestion du CODE (Auto ou Manuel)
            String code = fournisseur.getCode();
            boolean isAuto = code == null || code.trim().isEmpty()
                    || "AUTO".equalsIgnoreCase(code)
                    || code.endsWith("AUTO");

            if (isAuto) {
                synchronized (FOURNISSEUR_LOCK) {
                    String generatedCode;
                    int attempts = 0;
                    do {
                        generatedCode = numerotationService.generateNextNumber("FOURNISSEUR");
                        attempts++;
                    } while (fournisseurRepo.existsByCode(generatedCode) && attempts < 10);

                    fournisseur.setCode(generatedCode);
                }
            } else {
                numerotationService.validateReference("FOURNISSEUR", code);
                if (fournisseurRepo.existsByCode(code)) {
                    throw new IllegalStateException("Un fournisseur avec ce code existe déjà");
                }
            }

            // 3. Vérification de l'Email
            if (fournisseurRepo.existsByEmail(fournisseur.getEmail())) {
                throw new IllegalStateException("Un fournisseur avec cet email existe déjà");
            }
        }

        fournisseur.setEntreprise(entreprise);
        return fournisseurRepo.save(fournisseur);
    }

    public Fournisseur update(Long id, Fournisseur fournisseur) {
        Fournisseur existing = getById(id);
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        // Vérification si le nom a changé et s'il est déjà pris
        if (!existing.getNom().equalsIgnoreCase(fournisseur.getNom())) {
            if (fournisseurRepo.existsByNomAndEntreprise(fournisseur.getNom(), entreprise)) {
                throw new IllegalStateException("Un fournisseur avec ce nom existe déjà");
            }
        }

        // Vérification si le code a changé
        if (!existing.getCode().equals(fournisseur.getCode())) {
            numerotationService.validateReference("FOURNISSEUR", fournisseur.getCode());
            if (fournisseurRepo.existsByCode(fournisseur.getCode())) {
                throw new IllegalStateException("Un autre fournisseur utilise déjà ce code");
            }
        }

        fournisseur.setId(id);
        fournisseur.setEntreprise(entreprise);
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
