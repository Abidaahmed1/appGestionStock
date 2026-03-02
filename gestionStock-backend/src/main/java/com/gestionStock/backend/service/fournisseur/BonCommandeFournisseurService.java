package com.gestionStock.backend.service.fournisseur;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import com.gestionStock.backend.entity.Stock.TypeStock;
import com.gestionStock.backend.entity.fournisseur.BonCommandeFournisseur;
import com.gestionStock.backend.entity.fournisseur.LigneCommande;
import com.gestionStock.backend.entity.fournisseur.StatutCommande;
import com.gestionStock.backend.entity.notification.NotificationType;
import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.exceptions.FournisseurException;
import com.gestionStock.backend.repository.fournisseur.BonCommandeFournisseurRepository;
import com.gestionStock.backend.service.notification.NotificationService;
import com.gestionStock.backend.service.user.UserService;
import com.gestionStock.backend.repository.stock.StockRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import com.gestionStock.backend.entity.Stock.Stock;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional
public class BonCommandeFournisseurService {

    private static final Object NUMERO_CMD_LOCK = new Object();

    private final BonCommandeFournisseurRepository repository;
    private final BonCommandeFournisseurPersistHelper persistHelper;
    private final UserService userService;
    private final NotificationService notificationService;
    private final StockRepository stockRepo;

    public List<BonCommandeFournisseur> getAll() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();

            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATEUR"));

            if (isAdmin) {
                return repository.findAll();
            } else {
                return repository.findByCreateurId(userId);
            }
        }
        return repository.findAll();
    }

    public BonCommandeFournisseur getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon de commande non trouvé"));
    }

    private static boolean isUniquenessConstraintViolation(Throwable t) {
        for (Throwable x = t; x != null; x = x.getCause()) {
            if (x instanceof DataIntegrityViolationException) {
                return true;
            }
            String name = x.getClass().getSimpleName();
            if (name.contains("ConstraintViolation") || name.contains("DataIntegrity")) {
                return true;
            }
            String msg = x.getMessage();
            if (msg != null) {
                String m = msg.toLowerCase();
                if (m.contains("unique") || m.contains("duplicate") || m.contains("constraint")
                        || m.contains("violation")) {
                    return true;
                }
            }
        }
        return false;
    }

    private long generateNumeroCmd(long minExclusive) {
        LocalDate now = LocalDate.now();
        String aa = String.valueOf(now.getYear()).substring(2);
        String mm = String.format("%02d", now.getMonthValue());

        long rangeStart = Long.parseLong(aa + mm + "00001");
        long rangeEnd = Long.parseLong(aa + mm + "99999");

        Long maxExisting = repository.findMaxNumeroCmdBetween(rangeStart, rangeEnd);
        long next = maxExisting == null ? rangeStart : (maxExisting + 1);
        if (minExclusive > 0 && next <= minExclusive) {
            next = minExclusive + 1;
        }
        if (next > rangeEnd) {
            throw new FournisseurException("Plafond de commandes atteint pour ce mois (" + aa + "-" + mm + ").");
        }
        return next;
    }

    private long generateNumeroCmd() {
        return generateNumeroCmd(0L);
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

        boolean isNew = bon.getId() == null || Long.valueOf(0L).equals(bon.getId());
        if (isNew) {
            bon.setId(null);
        }

        if (isNew) {
            bon.setDateCmd(LocalDateTime.now());
            synchronized (NUMERO_CMD_LOCK) {
                bon.setNumeroCmd(generateNumeroCmd());
            }
            if (bon.getStatut() == null) {
                bon.setStatut(StatutCommande.EN_ATTENTE);
            }
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String userId = jwt.getSubject();
                String firstName = jwt.getClaimAsString("given_name");
                String lastName = jwt.getClaimAsString("family_name");
                String email = jwt.getClaimAsString("email");

                if (firstName == null)
                    firstName = "Utilisateur";
                if (lastName == null)
                    lastName = "Inconnu";

                User creator = userService.provisionUserIfNeeded(userId, firstName, lastName, email,
                        Role.RESPONSABLE_LOGISTIQUE);
                bon.setCreateur(creator);
            }
        }

        if (bon.getLignes() != null) {

            if (isNew) {
                bon.getLignes().forEach(ligne -> ligne.setId(null));
            }

            java.util.Map<String, LigneCommande> mergedMap = new java.util.HashMap<>();
            for (LigneCommande ligne : bon.getLignes()) {
                if (ligne.getPiece() != null && ligne.getPiece().getId() != null) {
                    Long pieceId = ligne.getPiece().getId();
                    Long detailId = ligne.getDetailPiece() != null ? ligne.getDetailPiece().getId() : 0L;
                    String key = pieceId + "_" + detailId;

                    if (mergedMap.containsKey(key)) {
                        LigneCommande existing = mergedMap.get(key);
                        existing.setQteCmd(existing.getQteCmd() + ligne.getQteCmd());
                    } else {
                        mergedMap.put(key, ligne);
                    }
                }
            }
            bon.setLignes(new java.util.ArrayList<>(mergedMap.values()));
            bon.getLignes().forEach(ligne -> {
                ligne.setBonCommandeFournisseur(bon);
                if (isNew) {
                    ligne.setId(null);
                }
            });
        }

        BonCommandeFournisseur savedBon;
        if (isNew) {
            final int maxAttempts = 3;
            savedBon = null;
            for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    savedBon = persistHelper.persist(bon);
                    break;
                } catch (Exception e) {
                    if (!isUniquenessConstraintViolation(e) || attempt == maxAttempts) {
                        throw e;
                    }

                    bon.setId(null);
                    if (bon.getLignes() != null) {
                        bon.getLignes().forEach(ligne -> ligne.setId(null));
                    }

                    long lastNumero = Optional.ofNullable(bon.getNumeroCmd()).orElse(0L);
                    synchronized (NUMERO_CMD_LOCK) {
                        bon.setNumeroCmd(generateNumeroCmd(lastNumero));
                    }
                    System.err.println("[BonCommandeFournisseur] Conflit d'unicité (tentative " + attempt + "/"
                            + maxAttempts + "), retry avec numeroCmd=" + bon.getNumeroCmd());
                }
            }
            if (savedBon == null) {
                throw new IllegalStateException("Persist failed after retries");
            }
        } else {
            savedBon = repository.save(bon);
        }

        if (isNew) {
            try {
                String nrCmdStr = savedBon.getNumeroCmd() != null ? savedBon.getNumeroCmd().toString() : "N/A";
                String createurNom = "";
                if (savedBon.getCreateur() != null) {
                    createurNom = " par " + savedBon.getCreateur().getFirstName() + " "
                            + savedBon.getCreateur().getLastName();
                }
                String msg = "Un nouveau bon de commande (N° " + nrCmdStr + ") a été passé avec succès" + createurNom
                        + ".";
                notificationService.createNotificationForRoles(
                        "NOUVELLE COMMANDE",
                        msg,
                        NotificationType.INFO,
                        List.of(Role.AUDITEUR, Role.MAGASINIER, Role.RESPONSABLE_LOGISTIQUE, Role.ADMINISTRATEUR),
                        null);
            } catch (Exception e) {
                System.err.println("Erreur lors de l'envoi de la notification : " + e.getMessage());
            }

            if (savedBon.getLignes() != null) {
                for (LigneCommande ligne : savedBon.getLignes()) {
                    if (ligne.getPiece() != null && ligne.getPiece().getId() != null) {
                        if (ligne.getDetailPiece() != null && ligne.getDetailPiece().getId() != null) {
                            Stock stock = stockRepo.findByDetailPieceId(ligne.getDetailPiece().getId()).orElse(null);

                            if (stock == null) {
                                stock = new Stock();
                                stock.setPiece(ligne.getPiece());
                                stock.setQuantite(0);
                                stock.setType(TypeStock.EN_REAPPROVISIONNEMENT);
                                stockRepo.save(stock);
                            } else {
                                stock.setType(TypeStock.EN_REAPPROVISIONNEMENT);
                                stockRepo.save(stock);
                            }
                        } else {
                            List<Stock> stocks = stockRepo.findByPieceId(ligne.getPiece().getId());
                            if (stocks.isEmpty()) {
                                Stock newStock = new Stock();
                                newStock.setPiece(ligne.getPiece());
                                newStock.setQuantite(0);
                                newStock.setType(TypeStock.EN_REAPPROVISIONNEMENT);
                                stockRepo.save(newStock);
                            } else {
                                for (Stock stock : stocks) {
                                    stock.setType(TypeStock.EN_REAPPROVISIONNEMENT);
                                    stockRepo.save(stock);
                                }
                            }
                        }
                    }
                }
            }
        }

        return savedBon;
    }

    public BonCommandeFournisseur update(Long id, BonCommandeFournisseur bon) {
        BonCommandeFournisseur existing = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon de commande non trouvé"));

        boolean newlyReceived = existing.getStatut() != StatutCommande.RECUE && bon.getStatut() == StatutCommande.RECUE;

        validateBon(bon);

        bon.setId(id);
        bon.setNumeroCmd(existing.getNumeroCmd());
        bon.setDateCmd(existing.getDateCmd());
        bon.setCreateur(existing.getCreateur());

        if (bon.getLignes() != null) {
            bon.getLignes().forEach(ligne -> ligne.setBonCommandeFournisseur(bon));
        }

        BonCommandeFournisseur savedBon = repository.save(bon);

        if (newlyReceived) {
            try {
                String nrCmdStr = savedBon.getNumeroCmd() != null ? savedBon.getNumeroCmd().toString() : "N/A";
                String msg = "La commande de réapprovisionnement (N° " + nrCmdStr
                        + ") a été réceptionnée.  Vous pouvez procéder à l'entrée en stock.";
                notificationService.createNotificationForRoles(
                        "COMMANDE REÇUE",
                        msg,
                        NotificationType.SUCCESS,
                        List.of(Role.MAGASINIER, Role.RESPONSABLE_LOGISTIQUE, Role.ADMINISTRATEUR),
                        null);
            } catch (Exception e) {
                System.err.println("Erreur lors de l'envoi de la notification de réception : " + e.getMessage());
            }
        }

        return savedBon;
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Bon de commande non trouvé");
        }
        repository.deleteById(id);
    }
}
