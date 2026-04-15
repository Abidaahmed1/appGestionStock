package com.gestionStock.backend.service.stock;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.gestionStock.backend.entity.Stock.Bon;
import com.gestionStock.backend.entity.Stock.TypeBon;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.stock.BonRepository;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional
public class BonService {

    private static final Object NUMERO_BON_LOCK = new Object();
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(BonService.class);
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
            return bonRepo.findByArchivedFalseAndEntrepriseOrderByDateDesc(entreprise);
        }

        return bonRepo.findByCreateurIdAndArchivedFalseAndEntrepriseOrderByDateDesc(userId, entreprise);
    }

    public List<Bon> getAllArchived() {
        String[] userInfo = getCurrentUserIdAndRole();
        String userId = userInfo[0];
        String role = userInfo[1];
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (isInternalRole(role)) {
            return bonRepo.findByArchivedTrueAndEntrepriseOrderByDateDesc(entreprise);
        }

        return bonRepo.findByCreateurIdAndArchivedTrueAndEntrepriseOrderByDateDesc(userId, entreprise);
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
                        .filter(this::isInternalRole)
                        .findFirst()
                        .orElseGet(() -> auth.getAuthorities().stream()
                                .map(a -> a.getAuthority())
                                .filter(r -> r.startsWith("ROLE_"))
                                .findFirst()
                                .orElse(""));
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
            return bonRepo.findByTypeBonAndArchivedFalseAndEntrepriseOrderByDateDesc(typeBon, entreprise);
        }

        return bonRepo.findByTypeBonAndCreateurIdAndArchivedFalseAndEntrepriseOrderByDateDesc(typeBon, userId,
                entreprise);
    }

    public List<Bon> getByDateRange(LocalDate startDate, LocalDate endDate) {
        String[] userInfo = getCurrentUserIdAndRole();
        String userId = userInfo[0];
        String role = userInfo[1];
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (isInternalRole(role)) {
            return bonRepo.findByDateBetweenAndArchivedFalseAndEntrepriseOrderByDateDesc(startDate, endDate, entreprise);
        }
        return bonRepo.findByDateBetweenAndCreateurIdAndArchivedFalseAndEntrepriseOrderByDateDesc(startDate, endDate, userId,
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
        validateBon(bon);
        if (bon.getArchived() == null) {
            bon.setArchived(false);
        }
        boolean isNew = bon.getId() == null || bon.getId().equals(0L);

        if (isNew) {
            bon.setId(null);
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

            if (bon.getEntreprise() == null) {
                bon.setEntreprise(userService.getCurrentUserEntreprise());
            }
        } else {
            Bon existing = getById(bon.getId());
            if (bon.getNumeroBon() != null && !existing.getNumeroBon().equals(bon.getNumeroBon())) {
                numerotationService.validateReference(getNumerotationModule(bon.getTypeBon()), bon.getNumeroBon());
                if (bonRepo.existsByNumeroBonAndEntreprise(bon.getNumeroBon(), existing.getEntreprise())) {
                    throw new IllegalStateException("Un autre bon utilise déjà ce numéro (" + bon.getNumeroBon() + ")");
                }
            }
        }

        // --- PRE-SAVE: Map bidirectional and ROLLBACK stock if editing ---
        if (bon.getMouvement() != null) {
            com.gestionStock.backend.entity.Stock.MouvementStock mvt = bon.getMouvement();
            mvt.setBon(bon);

            // Default Movement Type
            if (mvt.getTypeMouvement() == null) {
                switch (bon.getTypeBon()) {
                    case ENTREE:
                        mvt.setTypeMouvement(TypeMouvement.ENTREE_RECEPTION);
                        break;
                    case SORTIE:
                        mvt.setTypeMouvement(TypeMouvement.SORTIE_VENTE);
                        break;
                    case RETOUR:
                        mvt.setTypeMouvement(TypeMouvement.ENTREE_RETOUR);
                        break;
                }
            }

            // Resolve actual Piece entities from DB
            if (mvt.getLigneMouvement() != null) {
                for (LigneMouvement ligne : mvt.getLigneMouvement()) {
                    ligne.setMouvementStock(mvt);
                    if (ligne.getPiece() != null) {
                        PieceDetachee managedPiece = mouvementService.resolvePiece(ligne.getPiece());
                        if (managedPiece != null)
                            ligne.setPiece(managedPiece);
                    }
                }
            }

            // ROLLBACK old quantity if editing
            if (!isNew && bon.getId() != null) {
                Bon oldBon = bonRepo.findById(bon.getId()).orElse(null);
                if (oldBon != null && oldBon.getMouvement() != null) {
                    System.err.println("[STOCK_SYNC] ROLLBACK for old Bon #" + oldBon.getNumeroBon());
                    mouvementService.rollbackStockQuantity(oldBon.getMouvement());
                }
            }
        }

        // Generate Number if needed
        if (isNew && (bon.getNumeroBon() == null || bon.getNumeroBon().isEmpty()
                || "AUTO".equalsIgnoreCase(bon.getNumeroBon()))) {
            synchronized (NUMERO_BON_LOCK) {
                bon.setNumeroBon(numerotationService.generateNextNumber(getNumerotationModule(bon.getTypeBon())));
            }
        }

        System.err.println("[STOCK_SYNC] SAVING Bon #" + bon.getNumeroBon());
        Bon savedBon = bonRepo.save(bon);
        bonRepo.flush();

        if (savedBon.getMouvement() != null) {
            System.err.println("[STOCK_SYNC] UPDATE for Bon #" + savedBon.getNumeroBon());
            mouvementService.updateStockForMouvement(savedBon.getMouvement());
        }

        return savedBon;
    }

    public Bon update(Long id, Bon bon) {
        Bon existing = getById(id);

        if (!existing.getNumeroBon().equals(bon.getNumeroBon()) &&
                bonRepo.existsByNumeroBonAndEntreprise(bon.getNumeroBon(), existing.getEntreprise())) {
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

    private void validateBon(Bon bon) {
        if (bon.getMouvement() != null && bon.getMouvement().getLigneMouvement() != null) {
            for (com.gestionStock.backend.entity.Stock.LigneMouvement l : bon.getMouvement().getLigneMouvement()) {
                if (l.getQuantite() == null || l.getQuantite() <= 0) {
                    throw new IllegalArgumentException("La quantité doit être supérieure à 0 pour chaque ligne");
                }
                if (l.getPrixHTVA() == null || l.getPrixHTVA() <= 0) {
                    throw new IllegalArgumentException("Le prix unitaire doit être supérieur à 0 pour chaque ligne");
                }
                if (l.getTauxTVA() == null || l.getTauxTVA() <= 0) {
                    throw new IllegalArgumentException("Le taux TVA doit être supérieur à 0 pour chaque ligne");
                }
            }
        }
    }

    public void deletePermanently(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("L'ID est manquant.");
        }
        System.out.println("[DEBUG] Suppression définitive du bon ID: " + id);
        Bon bon = getById(id);
        
        // Remove associations that could cause integrity violations
        if (bon.getMouvement() != null) {
            // Unlink or delete as needed depending on cascade types. Usually orphanRemoval = true handles this.
            // But if we want to ensure no orphaned dependencies, we can explicitly clear it.
            // bon.setMouvement(null);
        }
        
        bonRepo.delete(bon);
    }
}