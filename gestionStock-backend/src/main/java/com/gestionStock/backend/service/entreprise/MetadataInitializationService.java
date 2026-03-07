package com.gestionStock.backend.service.entreprise;

import com.gestionStock.backend.entity.entreprise.Devise;
import com.gestionStock.backend.entity.entreprise.Pays;
import com.gestionStock.backend.repository.entreprise.DeviseRepository;
import com.gestionStock.backend.repository.entreprise.PaysRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetadataInitializationService {

    private final PaysRepository paysRepository;
    private final DeviseRepository deviseRepository;
    private final WebClient.Builder webClientBuilder;

    @PostConstruct
    public void init() {
        if (paysRepository.count() == 0) {
            initializeMetadata();
        }
    }

    public void initializeMetadata() {
        log.info("Initializing countries and currencies from external API...");
        WebClient webClient = webClientBuilder.baseUrl("https://restcountries.com/v3.1").build();

        webClient.get()
                .uri("/all?fields=name,cca2,currencies")
                .retrieve()
                .bodyToFlux(Map.class)
                .doOnNext(this::processCountry)
                .subscribe(
                        null,
                        error -> log.error("Error fetching metadata: {}", error.getMessage()),
                        () -> log.info("Metadata initialization completed."));
    }

    @SuppressWarnings("unchecked")
    private void processCountry(Map<String, Object> countryData) {
        try {
            String code = (String) countryData.get("cca2");
            Map<String, Object> nameMap = (Map<String, Object>) countryData.get("name");
            String name = (String) nameMap.get("common");

            if (paysRepository.findByCode(code).isEmpty()) {
                paysRepository.save(Pays.builder().code(code).nom(name).build());
            }

            Map<String, Object> currencies = (Map<String, Object>) countryData.get("currencies");
            if (currencies != null) {
                currencies.forEach((currencyCode, details) -> {
                    Map<String, String> detailsMap = (Map<String, String>) details;
                    String currencyName = detailsMap.get("name");
                    String symbol = detailsMap.get("symbol");

                    if (deviseRepository.findByCode(currencyCode).isEmpty()) {
                        deviseRepository.save(Devise.builder()
                                .code(currencyCode)
                                .nom(currencyName)
                                .symbole(symbol)
                                .build());
                    }
                });
            }
        } catch (Exception e) {
            log.error("Error processing country data: {}", e.getMessage());
        }
    }

    public List<Pays> getAllPays() {
        return paysRepository.findAllByOrderByNomAsc();
    }

    public List<Devise> getAllDevises() {
        return deviseRepository.findAllByOrderByNomAsc();
    }
}
