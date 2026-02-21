package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.Bon;
import com.gestionStock.backend.entity.Stock.TypeBon;
import com.gestionStock.backend.repository.stock.BonRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class BonService {

    private final BonRepository bonRepo;

    public List<Bon> getAll() {
        return bonRepo.findAll();
    }

    public Bon getById(Long id) {
        return bonRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon non trouvé"));
    }

    public List<Bon> getByType(TypeBon typeBon) {
        return bonRepo.findByTypeBon(typeBon);
    }

    public List<Bon> getByDateRange(LocalDate startDate, LocalDate endDate) {
        return bonRepo.findByDateBetween(startDate, endDate);
    }

    public Bon save(Bon bon) {
        if (bonRepo.existsByNumeroBon(bon.getNumeroBon())) {
            throw new IllegalStateException("Un bon avec ce numéro existe déjà");
        }
        if (bon.getDate() == null) {
            bon.setDate(LocalDate.now());
        }
        return bonRepo.save(bon);
    }

    public Bon update(Long id, Bon bon) {
        Bon existing = getById(id);

        if (!existing.getNumeroBon().equals(bon.getNumeroBon()) &&
                bonRepo.existsByNumeroBon(bon.getNumeroBon())) {
            throw new IllegalStateException("Un autre bon utilise déjà ce numéro");
        }

        bon.setId(id);
        return bonRepo.save(bon);
    }

    public void delete(Long id) {
        if (!bonRepo.existsById(id)) {
            throw new EntityNotFoundException("Bon non trouvé");
        }
        bonRepo.deleteById(id);
    }
}
