package com.gestionStock.backend.service.entreprise;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.repository.entreprise.DeviseRepository;
import com.gestionStock.backend.repository.entreprise.EntrepriseRepository;

import com.gestionStock.backend.entity.parametre.ParametreService;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class EntrepriseService {

    private final EntrepriseRepository entrepriseRepository;
    private final DeviseRepository deviseRepository;
    private final ParametreService parametreService;

    public List<Entreprise> getAllEntreprises() {
        return entrepriseRepository.findAll();
    }

    public Optional<Entreprise> getEntrepriseById(Long id) {
        return entrepriseRepository.findById(id);
    }

    public Entreprise saveEntreprise(Entreprise input) {
        if (input.getId() != null) {
            Entreprise existing = entrepriseRepository.findById(input.getId())
                    .orElseThrow(() -> new RuntimeException("Entreprise non trouvée"));

            existing.setNom(input.getNom());
            existing.setContact(input.getContact());
            existing.setAdresse(input.getAdresse());
            existing.setTelephone(input.getTelephone());
            existing.setEmail(input.getEmail());
            existing.setLogoUrl(input.getLogoUrl());
            existing.setCodePostal(input.getCodePostal());
            existing.setVille(input.getVille());
            existing.setRue(input.getRue());
            existing.setPays(input.getPays());

            if (input.getDevise() != null && input.getDevise().getId() != null) {
                deviseRepository.findById(input.getDevise().getId())
                        .ifPresent(existing::setDevise);
            } else {
                existing.setDevise(null);
            }

            return entrepriseRepository.save(existing);
        } else {
            Entreprise saved = entrepriseRepository.save(input);
            parametreService.initializeDefaultParameters(saved);
            return saved;
        }
    }

    public Entreprise updateLogoUrl(Long id, String logoUrl) {
        return entrepriseRepository.findById(id).map(e -> {
            e.setLogoUrl(logoUrl);
            return entrepriseRepository.save(e);
        }).orElse(null);
    }

    public void deleteEntreprise(Long id) {
        entrepriseRepository.deleteById(id);
    }
}
