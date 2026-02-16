package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.ProduitFini;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProduitFiniRepository extends JpaRepository<ProduitFini,Long> {
	List<ProduitFini> findByEstArchiveeFalse();

}
