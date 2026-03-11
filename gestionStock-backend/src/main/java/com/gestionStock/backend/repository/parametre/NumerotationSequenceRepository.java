package com.gestionStock.backend.repository.parametre;

import com.gestionStock.backend.entity.parametre.NumerotationSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NumerotationSequenceRepository extends JpaRepository<NumerotationSequence, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<NumerotationSequence> findByModuleAndEntrepriseIdAndPeriod(String module, Long entrepriseId, String period);
}
