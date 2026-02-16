package com.gestionStock.backend.repository.piece;

import com.gestionStock.backend.entity.piece.Entrepot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EntrepotRepository extends JpaRepository<Entrepot, Long> {
}
