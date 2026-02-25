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
    private final com.gestionStock.backend.service.user.UserService userService;

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

    private synchronized String generateNextNumeroBon(TypeBon type) {
        String prefix = "";
        if (type == TypeBon.ENTREE)
            prefix = "BE";
        else if (type == TypeBon.SORTIE)
            prefix = "BS";
        else if (type == TypeBon.RETOUR)
            prefix = "BR";
        else
            prefix = "B";

        LocalDate now = LocalDate.now();
        String yy = String.valueOf(now.getYear()).substring(2);
        String mm = String.format("%02d", now.getMonthValue());

        String basePrefix = prefix + yy + mm + "00";
        List<String> matches = bonRepo.findNumeroBonByPrefix(basePrefix);

        int sequence = 1;
        if (!matches.isEmpty()) {
            String last = matches.get(0);
            try {
                String seqPart = last.substring(basePrefix.length());
                sequence = Integer.parseInt(seqPart) + 1;
            } catch (Exception e) {
                sequence = matches.size() + 1;
            }
        }

        return basePrefix + sequence;
    }

    public Bon save(Bon bon) {
        boolean isNew = bon.getId() == null || bon.getId().equals(0L);

        if (isNew) {
            bon.setId(null);
            if (bon.getNumeroBon() == null || bon.getNumeroBon().isEmpty() || bon.getNumeroBon().equals("0")) {
                bon.setNumeroBon(generateNextNumeroBon(bon.getTypeBon()));
            } else if (bonRepo.existsByNumeroBon(bon.getNumeroBon())) {
                throw new IllegalStateException("Un bon avec ce numéro (" + bon.getNumeroBon() + ") existe déjà");
            }

            if (bon.getDate() == null) {
                bon.setDate(LocalDate.now());
            }

            try {
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
                    String userId = jwt.getSubject();
                    String firstName = jwt.getClaimAsString("given_name");
                    String lastName = jwt.getClaimAsString("family_name");
                    String email = jwt.getClaimAsString("email");

                    if (firstName == null)
                        firstName = "Utilisateur";
                    if (lastName == null)
                        lastName = "Inconnu";

                    com.gestionStock.backend.entity.user.User creator = userService.provisionUserIfNeeded(
                            userId, firstName, lastName, email, com.gestionStock.backend.entity.user.Role.MAGASINIER);
                    bon.setCreateur(creator);
                }
            } catch (Exception e) {
                System.err.println("Could not set creator for Bon: " + e.getMessage());
            }
        } else {
            Bon existing = getById(bon.getId());
            if (bon.getNumeroBon() != null && !existing.getNumeroBon().equals(bon.getNumeroBon()) &&
                    bonRepo.existsByNumeroBon(bon.getNumeroBon())) {
                throw new IllegalStateException("Un autre bon utilise déjà ce numéro (" + bon.getNumeroBon() + ")");
            }
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
        return save(bon);
    }

    public void delete(Long id) {
        if (!bonRepo.existsById(id)) {
            throw new EntityNotFoundException("Bon non trouvé");
        }
        bonRepo.deleteById(id);
    }
}
