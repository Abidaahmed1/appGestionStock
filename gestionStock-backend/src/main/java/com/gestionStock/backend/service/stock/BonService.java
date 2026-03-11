package com.gestionStock.backend.service.stock;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.Stock.Bon;
import com.gestionStock.backend.entity.Stock.TypeBon;
import com.gestionStock.backend.repository.stock.BonRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional
public class BonService {

    private static final Object NUMERO_BON_LOCK = new Object();
    private final BonRepository bonRepo;
    private final com.gestionStock.backend.service.user.UserService userService;
    private final MouvementStockService mouvementService;
    private final com.gestionStock.backend.service.notification.NotificationService notificationService;
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    public List<Bon> getAll() {
        String[] userInfo = getCurrentUserIdAndRole();
        String userId = userInfo[0];
        String role = userInfo[1];
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (isInternalRole(role)) {
            return bonRepo.findByArchivedFalseAndEntreprise(entreprise);
        }

        // Pour les magasiniers/auditeurs restreints, on filtre par créateur ET
        // entreprise
        return bonRepo.findByCreateurIdAndArchivedFalseAndEntreprise(userId, entreprise);
    }

    public List<Bon> getAllArchived() {
        String[] userInfo = getCurrentUserIdAndRole();
        String userId = userInfo[0];
        String role = userInfo[1];
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (isInternalRole(role)) {
            return bonRepo.findByArchivedTrueAndEntreprise(entreprise);
        }

        return bonRepo.findByCreateurIdAndArchivedTrueAndEntreprise(userId, entreprise);
    }

    private String[] getCurrentUserIdAndRole() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
                String jwtUserId = jwt.getSubject();
                String email = jwt.getClaimAsString("email");

                // Récupérer l'utilisateur en base (en utilisant les fallbacks de UserService)
                java.util.Optional<com.gestionStock.backend.entity.user.User> currentUserOpt = userService
                        .getCurrentUser();

                String effectiveUserId = jwtUserId;
                if (currentUserOpt.isPresent()) {
                    effectiveUserId = currentUserOpt.get().getId();
                }

                String role = auth.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .filter(r -> r.startsWith("ROLE_"))
                        .findFirst()
                        .orElse("");
                return new String[] { effectiveUserId, role, email != null ? email : "" };
            }
        } catch (Exception e) {
            System.err.println("Error getting current user: " + e.getMessage());
        }
        return new String[] { "", "", "" };
    }

    public Bon getById(Long id) {
        return bonRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon non trouvé"));
    }

    public List<Bon> getByType(TypeBon typeBon) {
        String[] userInfo = getCurrentUserIdAndRole();
        String userId = userInfo[0];
        String role = userInfo[1];
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (isInternalRole(role)) {
            return bonRepo.findByTypeBonAndArchivedFalseAndEntreprise(typeBon, entreprise);
        }
        return bonRepo.findByTypeBonAndCreateurIdAndArchivedFalseAndEntreprise(typeBon, userId, entreprise);
    }

    public List<Bon> getByDateRange(LocalDate startDate, LocalDate endDate) {
        String[] userInfo = getCurrentUserIdAndRole();
        String userId = userInfo[0];
        String role = userInfo[1];
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (isInternalRole(role)) {
            return bonRepo.findByDateBetweenAndArchivedFalseAndEntreprise(startDate, endDate, entreprise);
        }
        return bonRepo.findByDateBetweenAndCreateurIdAndArchivedFalseAndEntreprise(startDate, endDate, userId,
                entreprise);
    }

    private boolean isInternalRole(String role) {
        return "ROLE_AUDITEUR".equals(role) ||
                "ROLE_ADMINISTRATEUR".equals(role) ||
                "ROLE_RESPONSABLE_LOGISTIQUE".equals(role);
    }

    private String getNumerotationModule(TypeBon type) {
        return switch (type) {
            case ENTREE -> "BON_ENTREE";
            case SORTIE -> "BON_SORTIE";
            case RETOUR -> "BON_RETOUR";
        };
    }

    public Bon save(Bon bon) {
        boolean isNew = bon.getId() == null || bon.getId().equals(0L);

        if (isNew) {
            bon.setId(null);
            if (bon.getNumeroBon() == null || bon.getNumeroBon().isEmpty() || "0".equals(bon.getNumeroBon())
                    || "AUTO".equalsIgnoreCase(bon.getNumeroBon())) {
                synchronized (NUMERO_BON_LOCK) {
                    bon.setNumeroBon(numerotationService.generateNextNumber(getNumerotationModule(bon.getTypeBon())));
                }
            } else {
                numerotationService.validateReference(getNumerotationModule(bon.getTypeBon()), bon.getNumeroBon());
                if (bonRepo.existsByNumeroBon(bon.getNumeroBon())) {
                    throw new IllegalStateException("Un bon avec ce numéro (" + bon.getNumeroBon() + ") existe déjà");
                }
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

                    com.gestionStock.backend.entity.user.Role creatorRole = auth.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_AUDITEUR"))
                                    ? com.gestionStock.backend.entity.user.Role.AUDITEUR
                                    : com.gestionStock.backend.entity.user.Role.MAGASINIER;

                    com.gestionStock.backend.entity.user.User creator = userService.provisionUserIfNeeded(
                            userId,
                            firstName != null ? firstName : "Utilisateur",
                            lastName != null ? lastName : "Inconnu",
                            email,
                            creatorRole);
                    bon.setCreateur(creator);

                    com.gestionStock.backend.entity.entreprise.Entreprise ent = creator.getEntreprise();
                    if (ent == null) {
                        ent = userService.getCurrentUserEntreprise();
                    }
                    bon.setEntreprise(ent);
                }
            } catch (Exception e) {
                System.err.println("Could not set creator/entreprise for Bon: " + e.getMessage());
            }
        } else {
            Bon existing = getById(bon.getId());
            if (bon.getNumeroBon() != null && !existing.getNumeroBon().equals(bon.getNumeroBon())) {
                numerotationService.validateReference(getNumerotationModule(bon.getTypeBon()), bon.getNumeroBon());
                if (bonRepo.existsByNumeroBon(bon.getNumeroBon())) {
                    throw new IllegalStateException("Un autre bon utilise déjà ce numéro (" + bon.getNumeroBon() + ")");
                }
            }
        }

        if (bon.getMouvement() != null) {
            com.gestionStock.backend.entity.Stock.MouvementStock mvt = bon.getMouvement();
            mvt.setBon(bon);
            if (mvt.getLigneMouvement() != null) {
                for (com.gestionStock.backend.entity.Stock.LigneMouvement ligne : mvt.getLigneMouvement()) {
                    ligne.setMouvementStock(mvt);

                    // Resolve stock: replace the detached/partial Stock with a managed entity
                    if (ligne.getStock() != null && ligne.getStock().getId() != null) {
                        com.gestionStock.backend.entity.Stock.Stock managedStock = mouvementService
                                .resolveStock(ligne.getStock());
                        if (managedStock != null) {
                            ligne.setStock(managedStock);
                        }
                    }
                }
            }
        }

        Bon savedBon = null;
        int maxAttempts = 3;
        for (int i = 0; i < maxAttempts; i++) {
            try {
                savedBon = bonRepo.save(bon);
                break;
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                if (i == maxAttempts - 1)
                    throw e;
                // Force a new number generation for next attempt
                if (isNew) {
                    bon.setNumeroBon(null);
                } else {
                    throw e;
                }
            }
        }

        if (savedBon != null && savedBon.getMouvement() != null) {
            mouvementService.updateStockForMouvement(savedBon.getMouvement());
        }

        return savedBon;
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
        Bon bon = getById(id);
        if (bon.getMouvement() != null) {
            mouvementService.rollbackStockQuantity(bon.getMouvement());
        }

        bon.setArchived(true);
        bonRepo.save(bon);

        try {
            String roleStr = "";
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (auth != null) {
                roleStr = " par " + auth.getName();
            }

            notificationService.createNotificationForRoles(
                    "ANNULATION DE BON",
                    "Le bon N° " + bon.getNumeroBon() + " a été annulé et déplacé vers l'historique" + roleStr + ".",
                    com.gestionStock.backend.entity.notification.NotificationType.WARNING,
                    List.of(com.gestionStock.backend.entity.user.Role.AUDITEUR,
                            com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR),
                    null);
        } catch (Exception e) {
            System.err.println("Erreur notification suppression bon: " + e.getMessage());
        }
    }

    public Bon reactivate(Long id) {
        Bon bon = getById(id);
        if (bon.getArchived() == null || !bon.getArchived()) {
            return bon;
        }

        if (bon.getMouvement() != null) {
            mouvementService.updateStockForMouvement(bon.getMouvement());
        }

        bon.setArchived(false);
        Bon saved = bonRepo.save(bon);

        try {
            notificationService.createNotificationForRoles(
                    "RÉACTIVATION DE BON",
                    "Le bon N° " + bon.getNumeroBon() + " a été réactivé par  L'auditeur.",
                    com.gestionStock.backend.entity.notification.NotificationType.INFO,
                    List.of(com.gestionStock.backend.entity.user.Role.MAGASINIER,
                            com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR),
                    null);
        } catch (Exception e) {
            System.err.println("Erreur notification réactivation: " + e.getMessage());
        }

        return saved;
    }
}
