package com.gestionStock.backend.entity.parametre;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import com.gestionStock.backend.entity.entreprise.Entreprise;

import com.gestionStock.backend.repository.parametre.ParametreRepository;
import com.gestionStock.backend.service.user.UserService;

@Service
@RequiredArgsConstructor
@Transactional
public class ParametreService {

    private final ParametreRepository parametreRepository;
    private final UserService userService;

    public List<Parametre> getAllParametres() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return List.of();
        }
        return parametreRepository.findByEntrepriseId(entreprise.getId());
    }

    public List<Parametre> getCurrentParametres() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return List.of();
        }
        return parametreRepository.findByEntrepriseIdAndActifTrue(entreprise.getId());
    }

    public Optional<Parametre> getParametreById(Long id) {
        return parametreRepository.findById(id);
    }

    public List<Parametre> getParametresByEntrepriseId(Long entrepriseId) {
        return parametreRepository.findByEntrepriseId(entrepriseId);
    }

    public Parametre createParametre(Parametre parametre) {
        return parametreRepository.save(parametre);
    }

    public Parametre updateParametre(Long id, Parametre updatedParametre) {
        return parametreRepository.findById(id)
                .map(existing -> {
                    existing.setNom(updatedParametre.getNom() != null ? updatedParametre.getNom().trim() : "");
                    existing.setType(updatedParametre.getType());
                    existing.setObligatoire(updatedParametre.getObligatoire());
                    existing.setVariante(updatedParametre.getVariante());
                    existing.setOptions(updatedParametre.getOptions());
                    existing.setDefaultValue(updatedParametre.getDefaultValue());
                    existing.setDescription(updatedParametre.getDescription());

                    existing.setNumerotationConfigs(updatedParametre.getNumerotationConfigs());
                    existing.setActif(updatedParametre.getActif());
                    existing.setOrdre(updatedParametre.getOrdre());
                    return parametreRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Paramètre introuvable avec l'ID: " + id));
    }

    @Transactional
    public List<Parametre> updateParametres(List<Parametre> inputParametres) {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            throw new RuntimeException("Entreprise non identifiée");

        // 1. Filter out parameters with null/empty names and deduplicate input list by
        // name
        // (keeping the one with an ID if duplicates exist, to avoid creating new
        // entries for existing ones)
        java.util.Map<String, Parametre> deduplicatedInput = new java.util.LinkedHashMap<>();
        for (Parametre p : inputParametres) {
            String name = (p.getNom() != null ? p.getNom().trim() : "");
            if (name.isEmpty())
                continue;

            p.setNom(name);
            String key = name.toLowerCase();
            // If we find a duplicate name in the input, prefer the one that already has an
            // ID
            if (!deduplicatedInput.containsKey(key)
                    || (p.getId() != null && deduplicatedInput.get(key).getId() == null)) {
                deduplicatedInput.put(key, p);
            }
        }
        List<Parametre> updatedParametres = new java.util.ArrayList<>(deduplicatedInput.values());

        // 2. Get all current parameters for this enterprise (including inactive ones)
        List<Parametre> existingParams = parametreRepository.findByEntrepriseId(entreprise.getId());

        // Maps for fast lookup
        java.util.Map<Long, Parametre> byId = existingParams.stream()
                .filter(p -> p.getId() != null)
                .collect(java.util.stream.Collectors.toMap(Parametre::getId, p -> p));

        java.util.Map<String, Parametre> byName = existingParams.stream()
                .collect(java.util.stream.Collectors.toMap(p -> p.getNom().trim().toLowerCase(), p -> p, (a, b) -> a));

        java.util.Set<Long> processedIds = new java.util.HashSet<>();

        // 3. Prepare the list to save
        // We prioritize matching by NAME over ID to avoid unique constraint violations
        // if an existing (possibly inactive) record already has the desired name.
        List<Parametre> toSave = updatedParametres.stream().map(p -> {
            Parametre matched = null;
            String normalizedName = p.getNom().toLowerCase();

            // Try matching by name first
            matched = byName.get(normalizedName);

            // If not found by name, try matching by ID
            if (matched == null && p.getId() != null) {
                matched = byId.get(p.getId());
            }

            if (matched != null) {
                // Update existing record
                matched.setNom(p.getNom());
                matched.setType(p.getType());
                matched.setObligatoire(Boolean.TRUE.equals(p.getObligatoire()));
                matched.setVariante(Boolean.TRUE.equals(p.getVariante()));
                matched.setOptions(p.getOptions() != null ? p.getOptions() : new java.util.ArrayList<>());
                matched.setDefaultValue(p.getDefaultValue());
                matched.setDescription(p.getDescription());
                matched.setOrdre(p.getOrdre() != null ? p.getOrdre() : 0);
                matched.setActif(p.getActif() == null || Boolean.TRUE.equals(p.getActif()));
                matched.setNumerotationConfigs(
                        p.getNumerotationConfigs() != null ? p.getNumerotationConfigs() : new java.util.ArrayList<>());
                processedIds.add(matched.getId());
                return matched;
            } else {
                // Truly new parameter
                p.setEntreprise(entreprise);
                if (p.getActif() == null)
                    p.setActif(true);
                if (p.getObligatoire() == null)
                    p.setObligatoire(false);
                if (p.getVariante() == null)
                    p.setVariante(false);
                if (p.getOrdre() == null)
                    p.setOrdre(0);
                return p;
            }
        }).collect(java.util.stream.Collectors.toList());

        // 4. Deactivate parameters that are no longer present instead of deleting
        // and FLUSH changes to ensure names are freed if we were to delete (though here
        // we just deactivate)
        existingParams.stream()
                .filter(p -> p.getId() != null && !processedIds.contains(p.getId()))
                .forEach(p -> {
                    if (Boolean.TRUE.equals(p.getActif())) {
                        p.setActif(false);
                        parametreRepository.save(p);
                    }
                });

        parametreRepository.flush();

        // 5. Save all (updated and new)
        return parametreRepository.saveAll(toSave);
    }

    public void deleteParametre(Long id) {
        parametreRepository.deleteById(id);
    }

    // Ces méthodes sont obsolètes car on gère Parametre comme une entité SQL
    // standard maintenant
    // On garde cependant la structure si nécessaire pour le controller

    public Parametre createParametreForEntreprise(Parametre parametre) {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            throw new RuntimeException("Entreprise non trouvée");
        parametre.setEntreprise(entreprise);
        return parametreRepository.save(parametre);
    }

    public List<TypeChamp> getTypesChampsDisponibles() {
        return List.of(TypeChamp.values());
    }

    public Parametre updateNumerotationConfigs(List<NumerotationConfig> configs) {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            throw new RuntimeException("Entreprise non identifiée");

        Parametre parametre = parametreRepository.findByEntrepriseId(entreprise.getId()).stream()
                .findFirst()
                .orElseGet(() -> {
                    Parametre newParam = Parametre.builder()
                            .entreprise(entreprise)
                            .nom("Configuration Système")
                            .type(TypeChamp.TEXT)
                            .actif(true)
                            .ordre(0)
                            .build();
                    return parametreRepository.save(newParam);
                });

        parametre.setNumerotationConfigs(configs);
        return parametreRepository.save(parametre);
    }

    public List<NumerotationConfig> getNumerotationConfigs() {
        List<NumerotationConfig> configs = getCurrentParametres().stream()
                .flatMap(p -> p.getNumerotationConfigs().stream())
                .collect(Collectors.toList());

        if (configs.isEmpty()) {
            return getDefaultModules();
        }
        return configs;
    }

    private List<NumerotationConfig> getDefaultModules() {
        return Arrays.asList(
                new NumerotationConfig("PIECE", "REF-", "00001", "AUCUN", true, true),
                new NumerotationConfig("PRODUIT", "PRODUIT-", "00001", "AUCUN", true, true),
                new NumerotationConfig("CATEGORIE", "CATEGORIE-", "00001", "AUCUN", true, true),
                new NumerotationConfig("BON_COMMANDE", "BON_COMMANDE-", "00001", "AUCUN", true, true),
                new NumerotationConfig("BON_SORTIE", "BON_SORTIE-", "00001", "AUCUN", true, true),
                new NumerotationConfig("BON_ENTREE", "BON_ENTREE-", "00001", "AUCUN", true, true),
                new NumerotationConfig("BON_RETOUR", "BON_RETOUR-", "00001", "AUCUN", true, true),
                new NumerotationConfig("FOURNISSEUR", "FOUR-", "00001", "AUCUN", true, true));
    }

    public void initializeDefaultParameters(Entreprise entreprise) {
        if (parametreRepository.findByEntrepriseId(entreprise.getId()).isEmpty()) {
            Parametre systemParam = Parametre.builder()
                    .entreprise(entreprise)
                    .nom("Configuration Système")
                    .type(TypeChamp.TEXT)
                    .actif(true)
                    .ordre(0)
                    .numerotationConfigs(getDefaultModules())
                    .build();
            parametreRepository.save(systemParam);
        }
    }

    public boolean validerValeurParametre(Parametre parametre, String valeur) {
        if (valeur == null || valeur.trim().isEmpty()) {
            return !Boolean.TRUE.equals(parametre.getObligatoire());
        }

        try {
            switch (parametre.getType()) {
                case NUMBER:
                    Double.parseDouble(valeur);
                    break;
                case BOOLEAN:
                    if (!valeur.equalsIgnoreCase("true") && !valeur.equalsIgnoreCase("false")) {
                        return false;
                    }
                    break;
                case EMAIL:
                    return valeur.matches("^[A-Za-z0-9+_.-]+@(.+)$");
                case URL:
                    return valeur.matches("^(https?|ftp|file)://[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]");
                case SELECT:
                case LISTE:
                    return parametre.getOptions().contains(valeur);
                case TEXT:
                case TEXTAREA:
                case DATE:
                    break;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
