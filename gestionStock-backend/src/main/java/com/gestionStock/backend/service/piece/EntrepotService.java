package com.gestionStock.backend.service.piece;

import com.gestionStock.backend.entity.piece.Entrepot;
import com.gestionStock.backend.repository.piece.EntrepotRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class EntrepotService {

    private final EntrepotRepository entrepotRepository;

    public List<Entrepot> getAll() {
        return entrepotRepository.findAll();
    }

    public Entrepot create(Entrepot entrepot) {
        return entrepotRepository.save(entrepot);
    }

    public Entrepot update(Long id, Entrepot entrepot) {
        return entrepotRepository.findById(id)
                .map(existing -> {
                    existing.setNomEntrepot(entrepot.getNomEntrepot());
                    existing.setAdresse(entrepot.getAdresse());
                    existing.setVille(entrepot.getVille());
                    existing.setTaille(entrepot.getTaille());
                    return entrepotRepository.save(existing);
                }).orElseThrow(() -> new RuntimeException("Entrepot non trouvé avec l'id : " + id));
    }

    public void delete(Long id) {
        entrepotRepository.deleteById(id);
    }

    public Entrepot getById(Long id) {
        return entrepotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entrepot non trouvé avec l'id : " + id));
    }
}
