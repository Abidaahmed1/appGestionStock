package com.gestionStock.backend.repository.stock;

import com.gestionStock.backend.entity.Stock.Inventaire;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventaireRepository extends JpaRepository<Inventaire, Long> {
    List<Inventaire> findByEntreprise(Entreprise entreprise);

    boolean existsByNom(String nom);

    boolean existsByEntrepriseAndEstValideFalse(Entreprise entreprise);
}
