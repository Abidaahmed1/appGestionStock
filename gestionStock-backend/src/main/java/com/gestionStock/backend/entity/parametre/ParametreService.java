package com.gestionStock.backend.entity.parametre;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.repository.entreprise.EntrepriseRepository;
import com.gestionStock.backend.repository.parametre.ParametreRepository;
import com.gestionStock.backend.service.user.UserService;

@Service
@RequiredArgsConstructor
@Transactional
public class ParametreService {

    private final ParametreRepository parametreRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final UserService userService;

    public List<Parametre> getAllParametres() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return List.of();
        }
        return parametreRepository.findByEntrepriseId(entreprise.getId())
                .map(List::of)
                .orElse(List.of());
    }

    public Optional<Parametre> getCurrentParametre() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return Optional.empty();
        }
        Optional<Parametre> opt = parametreRepository.findByEntrepriseId(entreprise.getId());
        if (opt.isEmpty()) {
            Parametre newParam = new Parametre();
            newParam.setEntreprise(entreprise);
            newParam.setChampsPersonnalises(new java.util.ArrayList<>());
            return Optional.of(parametreRepository.save(newParam));
        }
        return opt;
    }

    public Optional<Parametre> getParametreById(Long id) {
        return parametreRepository.findById(id);
    }

    public Optional<Parametre> getParametreByEntrepriseId(Long entrepriseId) {
        Optional<Parametre> opt = parametreRepository.findByEntrepriseId(entrepriseId);
        if (opt.isEmpty()) {
            return entrepriseRepository.findById(entrepriseId).map(entreprise -> {
                Parametre newParam = new Parametre();
                newParam.setEntreprise(entreprise);
                newParam.setChampsPersonnalises(new java.util.ArrayList<>());
                return parametreRepository.save(newParam);
            });
        }
        return opt;
    }

    public Parametre createParametre(Parametre parametre) {
        return parametreRepository.save(parametre);
    }

    public Parametre updateParametre(Long id, Parametre parametre) {
        Parametre existingParametre = parametreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'ID: " + id));

        existingParametre.setEntreprise(parametre.getEntreprise());
        existingParametre.setChampsPersonnalises(parametre.getChampsPersonnalises());

        return parametreRepository.save(existingParametre);
    }

    public void deleteParametre(Long id) {
        parametreRepository.deleteById(id);
    }

    public Parametre ajouterChampPersonnalise(Long parametreId, ChampPersonnalise champ) {
        Parametre parametre = parametreRepository.findById(parametreId)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'ID: " + parametreId));

        boolean nomExiste = parametre.getChampsPersonnalises().stream()
                .anyMatch(c -> c.getNom().equals(champ.getNom()));

        if (nomExiste) {
            throw new RuntimeException("Un champ avec ce nom existe déjà: " + champ.getNom());
        }

        parametre.getChampsPersonnalises().add(champ);
        return parametreRepository.save(parametre);
    }

    public Parametre modifierChampPersonnalise(Long parametreId, String nomChamp, ChampPersonnalise champModifie) {
        Parametre parametre = parametreRepository.findById(parametreId)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'ID: " + parametreId));

        ChampPersonnalise champExist = parametre.getChampsPersonnalises().stream()
                .filter(c -> c.getNom().equals(nomChamp))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Champ non trouvé: " + nomChamp));

        int index = parametre.getChampsPersonnalises().indexOf(champExist);
        parametre.getChampsPersonnalises().set(index, champModifie);

        return parametreRepository.save(parametre);
    }

    public Parametre supprimerChampPersonnalise(Long parametreId, String nomChamp) {
        Parametre parametre = parametreRepository.findById(parametreId)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'ID: " + parametreId));

        parametre.getChampsPersonnalises().removeIf(c -> c.getNom().equals(nomChamp));
        return parametreRepository.save(parametre);
    }

    public List<TypeChamp> getTypesChampsDisponibles() {
        return List.of(TypeChamp.values());
    }

    public Parametre updateNumerotationConfigs(Long parametreId, List<NumerotationConfig> configs) {
        Parametre parametre = parametreRepository.findById(parametreId)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'ID: " + parametreId));

        parametre.setNumerotationConfigs(configs);
        return parametreRepository.save(parametre);
    }

    public List<NumerotationConfig> getNumerotationConfigs() {
        return getCurrentParametre()
                .map(Parametre::getNumerotationConfigs)
                .orElse(List.of());
    }

    public boolean validerValeurChamp(ChampPersonnalise champ, String valeur) {
        if (valeur == null || valeur.trim().isEmpty()) {
            return !champ.isObligatoire();
        }

        try {
            switch (champ.getType()) {
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
                    return champ.getOptions().contains(valeur);
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
