package com.gestionStock.backend.repository.entreprise;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.gestionStock.backend.entity.entreprise.Devise;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviseRepository extends JpaRepository<Devise, Long> {
    Optional<Devise> findByCode(String code);

    List<Devise> findAllByOrderByNomAsc();
}
