package com.gestionStock.backend.service.fournisseur;

import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.entity.fournisseur.BonCommandeFournisseur;
import com.gestionStock.backend.entity.fournisseur.StatutCommande;
import com.gestionStock.backend.exceptions.FournisseurException;
import com.gestionStock.backend.repository.fournisseur.BonCommandeFournisseurRepository;
import com.gestionStock.backend.repository.stock.StockRepository;
import com.gestionStock.backend.service.user.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class BonCommandeFournisseurService {

    private final BonCommandeFournisseurRepository repository;
    private final StockRepository stockRepo;
    private final UserService userService;

    public List<BonCommandeFournisseur> getAll() {
        return repository.findAll();
    }

    public BonCommandeFournisseur getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon de commande non trouvé"));
    }

    private long generateNumeroCmd() {
        LocalDate now = LocalDate.now();
        String aa = String.valueOf(now.getYear()).substring(2);
        String mm = String.format("%02d", now.getMonthValue());

        long rangeStart = Long.parseLong(aa + mm + "00001");
        long rangeEnd = Long.parseLong(aa + mm + "99999");

        Long maxExisting = repository.findMaxNumeroCmdBetween(rangeStart, rangeEnd);
        if (maxExisting == null) {
            return rangeStart;
        }
        long next = maxExisting + 1;
        if (next > rangeEnd) {
            throw new FournisseurException("Plafond de commandes atteint pour ce mois (" + aa + "-" + mm + ").");
        }
        return next;
    }

    private void validateBon(BonCommandeFournisseur bon) {
        if (bon.getDateArrivee() != null) {
            LocalDate today = LocalDate.now();
            if (!bon.getDateArrivee().isAfter(today)) {
                throw new FournisseurException(
                        "La date d'arrivée prévue (" + bon.getDateArrivee() +
                                ") doit être postérieure à aujourd'hui (" + today + ").");
            }
        }
        if (bon.getLignes() != null) {
            for (int i = 0; i < bon.getLignes().size(); i++) {
                var ligne = bon.getLignes().get(i);
                if (ligne.getPrixAchat() <= 0) {
                    String designation = ligne.getPiece() != null ? ligne.getPiece().getDesignation()
                            : "Ligne " + (i + 1);
                    throw new FournisseurException(
                            "Le prix unitaire de « " + designation + " » doit être supérieur à 0.");
                }
            }
        }
    }

    public BonCommandeFournisseur save(BonCommandeFournisseur bon) {
        validateBon(bon);

        if (bon.getId() == null) {
            bon.setDateCmd(LocalDateTime.now());
            bon.setNumeroCmd(generateNumeroCmd());
            if (bon.getStatut() == null) {
                bon.setStatut(StatutCommande.EN_ATTENTE);
            }
            // Enregistrer le créateur de la commande
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String userId = jwt.getSubject();
                userService.getUserById(userId).ifPresent(bon::setCreateur);
            }
        }

        if (bon.getLignes() != null) {
            bon.getLignes().forEach(ligne -> ligne.setBonCommandeFournisseur(bon));
        }

        return repository.save(bon);
    }

    public BonCommandeFournisseur update(Long id, BonCommandeFournisseur bon) {
        BonCommandeFournisseur existing = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon de commande non trouvé"));

        validateBon(bon);

        if (bon.getStatut() == StatutCommande.RECUE && existing.getStatut() != StatutCommande.RECUE) {
            if (bon.getLignes() != null) {
                bon.getLignes().forEach(ligne -> {
                    if (ligne.getPiece() != null) {
                        List<Stock> stocks = stockRepo.findByPieceId(ligne.getPiece().getId());
                        if (!stocks.isEmpty()) {
                            Stock s = stocks.get(0);
                            s.setQuantite(s.getQuantite() + ligne.getQteCmd());
                            if (s.getType() == TypeStock.EN_REAPPROVISIONNEMENT) {
                                s.setType(TypeStock.DISPONIBLE);
                            }
                            stockRepo.save(s);
                        }
                    }
                });
            }
        }

        bon.setId(id);
        bon.setNumeroCmd(existing.getNumeroCmd());
        bon.setDateCmd(existing.getDateCmd());
        bon.setCreateur(existing.getCreateur());

        if (bon.getLignes() != null) {
            bon.getLignes().forEach(ligne -> ligne.setBonCommandeFournisseur(bon));
        }

        return repository.save(bon);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Bon de commande non trouvé");
        }
        repository.deleteById(id);
    }
}
