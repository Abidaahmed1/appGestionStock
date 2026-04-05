package com.gestionStock.backend.service.fournisseur;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
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
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
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
    private final com.gestionStock.backend.entity.parametre.NumerotationService numerotationService;

    private final com.gestionStock.backend.repository.entreprise.EntrepriseRepository entrepriseRepository;

    public List<BonCommandeFournisseur> getAll() {
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null) {
            return java.util.List.of();
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();

            boolean hasFullAccess = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATEUR") ||
                            a.getAuthority().equals("ROLE_AUDITEUR"));

            if (hasFullAccess) {
                return repository.findByEntreprise(entreprise);
            } else {
                return repository.findByCreateurId(userId);
            }
        }
        return java.util.List.of();
    }

    public BonCommandeFournisseur getById(Long id) {
        BonCommandeFournisseur bon = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bon de commande non trouvé"));

        com.gestionStock.backend.entity.entreprise.Entreprise currentEntreprise = userService
                .getCurrentUserEntreprise();

        if (bon.getCreateur() != null && bon.getCreateur().getEntreprise() != null) {
            if (!bon.getCreateur().getEntreprise().equals(currentEntreprise)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Interdit : Cette commande appartient à une autre entreprise.");
            }
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            boolean hasFullAccess = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATEUR") ||
                            a.getAuthority().equals("ROLE_AUDITEUR"));

            if (!hasFullAccess && (bon.getCreateur() == null || !bon.getCreateur().getId().equals(userId))) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Vous n'avez pas l'autorisation d'accéder à cette commande.");
            }
        }
        return bon;
    }

    private void validateBon(BonCommandeFournisseur bon) {

        if (bon.getLignes() != null) {
            for (int i = 0; i < bon.getLignes().size(); i++) {
                var ligne = bon.getLignes().get(i);
                if (ligne.getPrixAchat() <= 0) {
                    String designation = ligne.getPiece() != null ? ligne.getPiece().getDesignation()
                            : "Ligne " + (i + 1);
                    throw new FournisseurException(
                            "Le prix unitaire de « " + designation + " » doit être supérieur à 0.");
                }
                if (ligne.getRemise() != null && ligne.getRemise() < 0) {
                    String designation = ligne.getPiece() != null ? ligne.getPiece().getDesignation()
                            : "Ligne " + (i + 1);
                    throw new FournisseurException(
                            "Le taux de remise de « " + designation + " » ne peut pas être négatif.");
                }
                if (ligne.getTaxe() != null && ligne.getTaxe() < 0) {
                    String designation = ligne.getPiece() != null ? ligne.getPiece().getDesignation()
                            : "Ligne " + (i + 1);
                    throw new FournisseurException(
                            "Le taux de taxe de « " + designation + " » ne peut pas être négatif.");
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
            com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();
            if (entreprise != null) {
                bon.setEntreprise(entreprise);
            } else if (bon.getEntreprise() != null && bon.getEntreprise().getId() != null) {
                bon.setEntreprise(entrepriseRepository.findById(bon.getEntreprise().getId()).orElse(null));
            }
            if (bon.getNumeroCmd() == null || bon.getNumeroCmd().isEmpty() || "0".equals(bon.getNumeroCmd())
                    || "AUTO".equalsIgnoreCase(bon.getNumeroCmd())) {
                synchronized (NUMERO_CMD_LOCK) {
                    bon.setNumeroCmd(numerotationService.generateNextNumber("BON_COMMANDE"));
                }
            } else {
                numerotationService.validateReference("BON_COMMANDE", bon.getNumeroCmd());
                if (repository.findByNumeroCmd(bon.getNumeroCmd()).isPresent()) {
                    throw new IllegalStateException(
                            "Une commande avec ce numéro (" + bon.getNumeroCmd() + ") existe déjà");
                }
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
            try {
                savedBon = persistHelper.persist(bon);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de la sauvegarde du bon de commande: " + e.getMessage(), e);
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
                        Arrays.asList(Role.AUDITEUR, Role.MAGASINIER, Role.RESPONSABLE_LOGISTIQUE, Role.ADMINISTRATEUR),
                        null);
            } catch (Exception e) {
                System.err.println("Erreur lors de l'envoi de la notification : " + e.getMessage());
            }
        }

        return savedBon;
    }

    public BonCommandeFournisseur update(Long id, BonCommandeFournisseur bon) {
        BonCommandeFournisseur existing = getById(id);

        boolean newlyReceived = existing.getStatut() != StatutCommande.RECUE && bon.getStatut() == StatutCommande.RECUE;

        validateBon(bon);

        // Mise à jour de l'objet existant (évite les erreurs de Row updated/deleted)
        existing.setStatut(bon.getStatut());
        if (bon.getDateArrivee() != null) {
            existing.setDateArrivee(bon.getDateArrivee());
        }

        BonCommandeFournisseur savedBon = repository.save(existing);

        if (newlyReceived) {
            try {
                String nrCmdStr = savedBon.getNumeroCmd() != null ? savedBon.getNumeroCmd().toString() : "N/A";
                String msg = "La commande de réapprovisionnement (N° " + nrCmdStr
                        + ") a été réceptionnée.  Vous pouvez procéder à l'entrée en stock.";
                notificationService.createNotificationForRoles(
                        "COMMANDE REÇUE",
                        msg,
                        NotificationType.SUCCESS,
                        Arrays.asList(Role.MAGASINIER, Role.RESPONSABLE_LOGISTIQUE, Role.ADMINISTRATEUR),
                        null);
            } catch (Exception e) {
                System.err.println("Erreur lors de l'envoi de la notification de réception : " + e.getMessage());
            }
        }

        return savedBon;
    }

    public void delete(Long id) {
        getById(id);
        repository.deleteById(id);
    }
}
