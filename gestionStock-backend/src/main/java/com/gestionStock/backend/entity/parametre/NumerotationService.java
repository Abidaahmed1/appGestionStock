package com.gestionStock.backend.entity.parametre;

import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.repository.parametre.NumerotationSequenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class NumerotationService {

    private final ParametreService parametreService;
    private final NumerotationSequenceRepository sequenceRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generateNextNumber(String module) {
        java.util.List<Parametre> params = parametreService.getCurrentParametres();
        if (params.isEmpty()) {
            return "DEFAULT-" + System.currentTimeMillis();
        }

        NumerotationConfig config = null;
        Entreprise entreprise = params.get(0).getEntreprise();

        for (Parametre p : params) {
            config = p.getNumerotationConfigs().stream()
                    .filter(c -> c.getModule().equals(module) && c.isActif())
                    .findFirst()
                    .orElse(null);
            if (config != null)
                break;
        }

        if (config == null)
            config = getDefaultConfig(module);

        return generate(config, entreprise.getId());
    }

    private NumerotationConfig getDefaultConfig(String module) {
        return NumerotationConfig.builder()
                .module(module)
                .prefix(module + "-")
                .numeroDebut("00001")
                .redemarrer("AUCUN")
                .actif(true)
                .build();
    }

    private String generate(NumerotationConfig config, Long entrepriseId) {
        LocalDate now = LocalDate.now();
        String period = "GLOBAL";

        if ("ANNUEL".equalsIgnoreCase(config.getRedemarrer())) {
            period = String.valueOf(now.getYear());
        } else if ("MENSUEL".equalsIgnoreCase(config.getRedemarrer())) {
            period = now.getYear() + "-" + String.format("%02d", now.getMonthValue());
        }

        NumerotationSequence sequence = sequenceRepository
                .findByModuleAndEntrepriseIdAndPeriod(config.getModule(), entrepriseId, period)
                .orElse(NumerotationSequence.builder()
                        .module(config.getModule())
                        .entrepriseId(entrepriseId)
                        .period(period)
                        .currentVal(Long.parseLong(config.getNumeroDebut()) - 1)
                        .build());

        long nextVal = sequence.getCurrentVal() + 1;
        sequence.setCurrentVal(nextVal);
        sequenceRepository.save(sequence);

        String formattedPrefix = replacePlaceholders(config.getPrefix(), now);
        String formattedNumber = String.format("%0" + config.getNumeroDebut().length() + "d", nextVal);

        return formattedPrefix + formattedNumber;
    }

    public void validateReference(String module, String reference) {
        if (reference == null || reference.trim().isEmpty())
            return;

        java.util.List<Parametre> params = parametreService.getCurrentParametres();
        if (params.isEmpty())
            return;

        NumerotationConfig config = null;
        for (Parametre p : params) {
            config = p.getNumerotationConfigs().stream()
                    .filter(c -> c.getModule().equals(module))
                    .findFirst()
                    .orElse(null);
            if (config != null)
                break;
        }

        if (config == null)
            config = getDefaultConfig(module);

        if (!config.isActif())
            return;

        String formattedPrefix = replacePlaceholders(config.getPrefix(), LocalDate.now());
        if (!reference.startsWith(formattedPrefix)) {
            throw new RuntimeException(
                    "Le format de la référence '" + reference + "' est invalide pour le module " + module +
                            ". Elle doit commencer par le préfixe configuré : '" + formattedPrefix + "'.");
        }
    }

    private String replacePlaceholders(String prefix, LocalDate date) {
        if (prefix == null)
            return "";
        return prefix
                .replace("%YYYY%", String.valueOf(date.getYear()))
                .replace("%YY%", String.valueOf(date.getYear()).substring(2))
                .replace("%MM%", String.format("%02d", date.getMonthValue()))
                .replace("%DD%", String.format("%02d", date.getDayOfMonth()));
    }
}
