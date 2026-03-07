package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.ProduitFini;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionStock.backend.entity.entreprise.Entreprise;

public interface ProduitFiniRepository extends JpaRepository<ProduitFini, Long> {
	List<ProduitFini> findByEstArchiveeFalse();

	List<ProduitFini> findByEstArchiveeFalseAndEntreprise(Entreprise entreprise);

	List<ProduitFini> findByEntreprise(Entreprise entreprise);

	boolean existsByCodeAndEntreprise(String code, Entreprise entreprise);
}
