package com.gestionStock.backend.repository.entreprise;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.gestionStock.backend.entity.entreprise.Pays;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaysRepository extends JpaRepository<Pays, Long> {
    Optional<Pays> findByCode(String code);

    List<Pays> findAllByOrderByNomAsc();
}
