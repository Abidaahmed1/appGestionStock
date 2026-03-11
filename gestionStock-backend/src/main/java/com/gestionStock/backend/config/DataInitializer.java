package com.gestionStock.backend.config;

import com.gestionStock.backend.entity.piece.Unite;
import com.gestionStock.backend.repository.piece.UniteRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initUnits(UniteRepository uniteRepository) {
        return args -> {
            if (uniteRepository.count() == 0) {
                uniteRepository.saveAll(List.of(
                        Unite.builder().nom("Pièce").abbreviation("pce").build(),
                        Unite.builder().nom("Kilogramme").abbreviation("kg").build(),
                        Unite.builder().nom("Gramme").abbreviation("g").build(),
                        Unite.builder().nom("Litre").abbreviation("L").build(),
                        Unite.builder().nom("Mètre").abbreviation("m").build(),
                        Unite.builder().nom("Centimètre").abbreviation("cm").build(),
                        Unite.builder().nom("Millimètre").abbreviation("mm").build(),
                        Unite.builder().nom("Rouleau").abbreviation("rl").build(),
                        Unite.builder().nom("Boîte").abbreviation("bt").build(),
                        Unite.builder().nom("Paquet").abbreviation("pq").build()));
            }
        };
    }
}
