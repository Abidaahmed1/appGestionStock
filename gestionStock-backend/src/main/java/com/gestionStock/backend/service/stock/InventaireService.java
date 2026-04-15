package com.gestionStock.backend.service.stock;

import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;

import com.gestionStock.backend.entity.Stock.Inventaire;
import com.gestionStock.backend.entity.Stock.LigneInventaire;
import com.gestionStock.backend.entity.Stock.LigneStatut;
import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.stock.LigneInventaireRepository;
import com.gestionStock.backend.repository.piece.PieceHistoriqueRepository;
import com.gestionStock.backend.repository.stock.InventaireRepository;
import com.gestionStock.backend.entity.Stock.LigneInventaireHistorique;
import com.gestionStock.backend.repository.stock.LigneInventaireHistoriqueRepository;
import com.gestionStock.backend.dto.stock.CreateInventaireRequest;
import com.gestionStock.backend.service.user.UserService;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.service.notification.NotificationService;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InventaireService {

    private final InventaireRepository inventaireRepo;
    private final LigneInventaireRepository ligneInventaireRepo;
    private final PieceHistoriqueRepository pieceHistoriqueRepo;
    private final PieceDetacheeRepository pieceRepo;
    private final UserService userService;
    private final MouvementStockService mouvementStockService;
    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;
    private final LigneInventaireHistoriqueRepository ligneHistoriqueRepo;

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE mouvement_stock DROP CONSTRAINT IF EXISTS mouvement_stock_type_mouvement_check;");
            System.out.println("[DB FIX] Dropped stale mouvement_stock_type_mouvement_check constraint.");
        } catch (Exception e) {
            System.err.println("[DB FIX] Could not drop constraint: " + e.getMessage());
        }
    }

    public List<Inventaire> getAll() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            return java.util.Collections.emptyList();
        return inventaireRepo.findByEntreprise(entreprise);
    }

    public Inventaire getById(Long id) {
        return inventaireRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inventaire non trouvé"));
    }

    public Inventaire create(Inventaire inventaire) {
        Entreprise entreprise = userService.getCurrentUserEntreprise();

        // Règle : un seul inventaire actif à la fois
        if (inventaireRepo.existsByEntrepriseAndEstValideFalse(entreprise)) {
            throw new IllegalStateException(
                    "Un inventaire est déjà en cours. Veuillez le valider avant d'en créer un nouveau.");
        }

        inventaire.setCreateur(userService.getCurrentUser().orElse(null));
        inventaire.setEntreprise(entreprise);

        if (inventaire.getDate() == null) {
            inventaire.setDate(LocalDateTime.now());
        }

        inventaire.setEstValide(false);

        // For a TOTAL inventory, load only active pieces
        List<PieceDetachee> pieces = pieceRepo.findByArchiveeAndEntreprise(false, entreprise);
        buildLignes(inventaire, pieces, null);
        return inventaireRepo.save(inventaire);
    }

    public Inventaire createFromRequest(CreateInventaireRequest req) {
        Entreprise entreprise = userService.getCurrentUserEntreprise();

        // Règle : un seul inventaire actif à la fois
        if (inventaireRepo.existsByEntrepriseAndEstValideFalse(entreprise)) {
            throw new IllegalStateException(
                    "Un inventaire est déjà en cours. Veuillez le valider avant d'en créer un nouveau.");
        }

        if (req.getNom() != null && inventaireRepo.existsByNom(req.getNom())) {
            throw new IllegalArgumentException("Un inventaire avec ce nom existe déjà.");
        }

        Inventaire inventaire = new Inventaire();
        inventaire.setNom(req.getNom());
        inventaire.setType(req.getType());
        inventaire.setDate(req.getDate() != null ? req.getDate() : LocalDateTime.now());
        inventaire.setEstValide(false);
        inventaire.setCreateur(userService.getCurrentUser().orElse(null));
        inventaire.setEntreprise(entreprise);

        final List<PieceDetachee> pieces;
        if (req.getCategoryIds() != null && !req.getCategoryIds().isEmpty()) {
            pieces = pieceRepo.findByCategoryIds(req.getCategoryIds(), entreprise);
        } else if (req.getAffectations() != null && !req.getAffectations().isEmpty()) {
            List<Long> pieceIds = req.getAffectations().stream()
                    .map(com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation::getPieceId)
                    .collect(Collectors.toList());
            pieces = pieceRepo.findAllById(pieceIds);
        } else {
            pieces = pieceRepo.findByArchiveeAndEntreprise(false, entreprise);
        }

        buildLignes(inventaire, pieces, req.getAffectations());
        return inventaireRepo.save(inventaire);
    }

    public Inventaire refuser(Long id, String motif) {
        Inventaire inventaire = getById(id);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de refuser un inventaire déjà validé ou terminé");
        }
        inventaire.setMotifRefus(motif);
        // On peut envisager de notifier les responsables ici
        return inventaireRepo.save(inventaire);
    }

    private void buildLignes(Inventaire inventaire, List<PieceDetachee> pieces,
            List<com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation> affectations) {
        List<LigneInventaire> lignes = pieces.stream()
                .filter(piece -> piece.getQuantite() != null && piece.getQuantite() > 0)
                .map(piece -> {
                    LigneInventaire ligne = new LigneInventaire();
                    ligne.setPiece(piece);
                    ligne.setStockTheorique(piece.getQuantite());
                    ligne.setStockPhysique(null); // null means À SCANNER
                    ligne.setEcart(null);
                    ligne.setStatutLigne(LigneStatut.A_SCANNER);
                    ligne.setDateInventaire(inventaire.getDate());
                    ligne.setCreateurLigne(inventaire.getCreateur());
                    ligne.setInventaire(inventaire);

                    return ligne;
                }).collect(Collectors.toList());
        inventaire.setLignes(lignes);
    }

    public Inventaire update(Long id, Inventaire updated) {
        Inventaire existing = getById(id);
        if (existing.isEstValide() || existing.isEstTermine()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé ou terminé");
        }

        if (updated.getLignes() != null) {
            for (LigneInventaire updatedLigne : updated.getLignes()) {
                LigneInventaire existingLigne = existing.getLignes().stream()
                        .filter(l -> l.getId() != null && l.getId().equals(updatedLigne.getId()))
                        .findFirst().orElse(null);

                if (existingLigne != null) {
                    existingLigne.setCommentaire(updatedLigne.getCommentaire());

                    // Capture le responsable du scan s'il est envoyé ou si c'est l'utilisateur
                    // courant
                    User scanner = (updatedLigne.getResponsableLogistique() != null)
                            ? updatedLigne.getResponsableLogistique()
                            : userService.getCurrentUser().orElse(null);

                    if (scanner != null) {
                        existingLigne.setResponsableLogistique(scanner);
                    }

                    if (updatedLigne.getStockPhysique() != null) {
                        Integer oldVal = existingLigne.getStockPhysique();
                        Integer newVal = updatedLigne.getStockPhysique();

                        existingLigne.setStockPhysique(newVal);
                        existingLigne.setEcart(newVal
                                - (existingLigne.getStockTheorique() != null ? existingLigne.getStockTheorique() : 0));

                        if (existingLigne.getStatutLigne() == LigneStatut.A_SCANNER) {
                            addHistoryToLigne(existingLigne, "SCAN_MOBILE",
                                    "Quantité scannée via mobile (par "
                                            + (scanner != null ? scanner.getFirstName() : "inconnu") + ")",
                                    null, newVal,
                                    existingLigne.getStatutLigne(), LigneStatut.EN_ATTENTE_AUDIT, scanner);
                            existingLigne.setStatutLigne(LigneStatut.EN_ATTENTE_AUDIT);
                        } else if (!newVal.equals(oldVal)) {
                            addHistoryToLigne(existingLigne, "MISE_A_JOUR_SCAN",
                                    "Mise à jour du scan via mobile",
                                    oldVal, newVal,
                                    existingLigne.getStatutLigne(), existingLigne.getStatutLigne(), scanner);
                        }
                    } else {
                        existingLigne.setEcart(null);
                    }
                }
            }
        }

        existing.setNom(updated.getNom());
        existing.setType(updated.getType());
        existing.setDate(updated.getDate());

        return inventaireRepo.save(existing);
    }

    public Inventaire valider(Long id) {
        Inventaire inventaire = getById(id);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Inventaire déjà validé ou terminé");
        }

        long linesNotProcessed = inventaire.getLignes().stream()
                .filter(l -> l.getStatutLigne() != LigneStatut.VALIDE && l.getStatutLigne() != LigneStatut.REFUSE)
                .count();

        if (linesNotProcessed > 0) {
            throw new IllegalStateException("Impossible de valider l'inventaire : il reste " + linesNotProcessed
                    + " ligne(s) non traitée(s). Veuillez toutes les valider ou les refuser individuellement.");
        }

        // Créer les mouvements de stock pour les écarts
        for (LigneInventaire ligne : inventaire.getLignes()) {
            if (ligne.getStockPhysique() != null) {
                ligne.setEcart(
                        ligne.getStockPhysique() - (ligne.getStockTheorique() != null ? ligne.getStockTheorique() : 0));
            }
            Integer ecart = ligne.getEcart();
            if (ecart != null && ecart != 0) {
                MouvementStock mouvement = new MouvementStock();
                mouvement.setDate(LocalDateTime.now());
                mouvement.setTypeMouvement(
                        ecart > 0 ? TypeMouvement.ENTREE_INVENTAIRE : TypeMouvement.SORTIE_INVENTAIRE);

                LigneMouvement ligneMvt = new LigneMouvement();
                ligneMvt.setPiece(ligne.getPiece());
                ligneMvt.setQuantite(Math.abs(ecart));
                ligneMvt.setPrixHTVA(ligne.getPiece() != null && ligne.getPiece().getPrixVente() != null
                        ? ligne.getPiece().getPrixVente()
                        : 0.0);
                ligneMvt.setTauxTVA(ligne.getPiece() != null && ligne.getPiece().getTauxTVA() != null
                        ? ligne.getPiece().getTauxTVA()
                        : 0.0);
                ligneMvt.setMouvementStock(mouvement);

                List<LigneMouvement> lignesMvt = new ArrayList<>();
                lignesMvt.add(ligneMvt);
                mouvement.setLigneMouvement(lignesMvt);

                // On enregistre le mouvement via le service pour mettre à jour le stock
                mouvementStockService.save(mouvement);
            }
            ligne.setEstValide(true);
        }

        inventaire.setEstValide(true);
        inventaire.setEstTermine(true);
        inventaire.setHeureFinEffective(LocalDateTime.now());
        return inventaireRepo.save(inventaire);
    }

    public Inventaire demanderRecomptage(Long inventaireId, Long ligneId, String motif) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé ou terminé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setAuditeur(userService.getCurrentUser().orElse(null));
        addHistoryToLigne(ligne, "DEMANDE_RECOMPTAGE",
                "L'auditeur demande un nouveau comptage. Motif: " + (motif != null ? motif : "Non spécifié"),
                ligne.getStockPhysique(), null,
                ligne.getStatutLigne(), LigneStatut.A_RECOMPTER, null);

        ligne.setStatutLigne(LigneStatut.A_RECOMPTER);
        ligne.setStockPhysique(null);
        ligne.setEcart(null);

        if (ligne.getResponsableLogistique() != null) {
            String msg = "L'auditeur demande de re-compter la pièce "
                    + (ligne.getPiece() != null ? ligne.getPiece().getDesignation() : "")
                    + " dans l'inventaire " + inventaire.getNom();
            if (motif != null && !motif.isBlank()) {
                msg += ". Motif : " + motif;
            }

            notificationService.createNotificationForUser(
                    "Action Requise: Re-comptage demandé",
                    msg,
                    com.gestionStock.backend.entity.notification.NotificationType.WARNING,
                    ligne.getResponsableLogistique(),
                    ligne.getPiece() != null ? ligne.getPiece().getId() : null);
        }

        return inventaireRepo.save(inventaire);
    }

    public Inventaire validerLigne(Long inventaireId, Long ligneId) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé ou terminé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        if (ligne.getStockPhysique() != null) {
            ligne.setEcart(
                    ligne.getStockPhysique() - (ligne.getStockTheorique() != null ? ligne.getStockTheorique() : 0));
        }

        if (ligne.getEcart() != null && ligne.getEcart() != 0) {
            creerMouvementEcart(ligne);
        }

        ligne.setAuditeur(userService.getCurrentUser().orElse(null));
        addHistoryToLigne(ligne, "VALIDATION_LIGNE",
                "Validation du comptage par l'auditeur",
                ligne.getStockPhysique(), ligne.getStockPhysique(),
                ligne.getStatutLigne(), LigneStatut.VALIDE, null);

        ligneInventaireRepo.updateLigneStockNative(ligneId, ligne.getStockPhysique(), ligne.getEcart(),
                LigneStatut.VALIDE.name());

        return getById(inventaireId);
    }

    public Inventaire refuserLigne(Long inventaireId, Long ligneId) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé ou terminé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setAuditeur(userService.getCurrentUser().orElse(null));
        addHistoryToLigne(ligne, "REFUS_LIGNE",
                "Refus du comptage par l'auditeur",
                ligne.getStockPhysique(), ligne.getStockPhysique(),
                ligne.getStatutLigne(), LigneStatut.REFUSE, null);

        ligne.setStatutLigne(LigneStatut.REFUSE);
        return inventaireRepo.save(inventaire);
    }

    public Inventaire reinitialiserLigne(Long inventaireId, Long ligneId) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé ou terminé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setAuditeur(userService.getCurrentUser().orElse(null));
        addHistoryToLigne(ligne, "REINITIALISATION_LIGNE",
                "Réinitialisation de la décision",
                ligne.getStockPhysique(), ligne.getStockPhysique(),
                ligne.getStatutLigne(), LigneStatut.EN_ATTENTE_AUDIT, null);

        // Si la ligne était déjà validée, on remet à EN_ATTENTE_AUDIT
        // C'est une réinitialisation de décision.
        ligne.setStatutLigne(LigneStatut.EN_ATTENTE_AUDIT);
        return inventaireRepo.save(inventaire);
    }

    private void creerMouvementEcart(LigneInventaire ligne) {
        Integer ecart = ligne.getEcart();
        if (ecart == null || ecart == 0)
            return;

        MouvementStock mouvement = new MouvementStock();
        mouvement.setDate(LocalDateTime.now());
        mouvement.setTypeMouvement(ecart > 0 ? TypeMouvement.ENTREE_INVENTAIRE : TypeMouvement.SORTIE_INVENTAIRE);

        LigneMouvement ligneMvt = new LigneMouvement();
        ligneMvt.setPiece(ligne.getPiece());
        ligneMvt.setQuantite(Math.abs(ecart));
        ligneMvt.setPrixHTVA(
                ligne.getPiece() != null && ligne.getPiece().getPrixVente() != null ? ligne.getPiece().getPrixVente()
                        : 0.0);
        ligneMvt.setTauxTVA(
                ligne.getPiece() != null && ligne.getPiece().getTauxTVA() != null ? ligne.getPiece().getTauxTVA()
                        : 0.0);
        ligneMvt.setMouvementStock(mouvement);

        mouvement.setLigneMouvement(List.of(ligneMvt));
        mouvementStockService.save(mouvement);
    }

    public Inventaire corrigerLigneManuellement(Long inventaireId, Long ligneId, Integer nouveauStock) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé ou terminé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setAuditeur(userService.getCurrentUser().orElse(null));
        addHistoryToLigne(ligne, "CORRECTION_MANUELLE",
                "Correction manuelle par l'auditeur",
                ligne.getStockPhysique(), nouveauStock,
                ligne.getStatutLigne(), LigneStatut.VALIDE, null);

        ligne.setStockPhysique(nouveauStock);

        // Ecart pour le rapport
        ligne.setEcart(nouveauStock - (ligne.getStockTheorique() != null ? ligne.getStockTheorique() : 0));
        ligne.setStatutLigne(LigneStatut.VALIDE);

        // Correction du stock réel par rapport à la DB actuelle
        int stockEnBase = (ligne.getPiece() != null && ligne.getPiece().getQuantite() != null)
                ? ligne.getPiece().getQuantite()
                : 0;
        // MISE A JOUR DIRECTE DU STOCK PIECE (Dmd de l'utilisateur : ne pas passer par
        // MouvementStock)
        if (ligne.getPiece() != null) {
            pieceRepo.updateQuantityNative(ligne.getPiece().getId(), nouveauStock);

            // INSERT natif : aucun conflit de session ou de séquence possible
            String userId = userService.getCurrentUser()
                    .map(u -> u.getId().toString())
                    .orElse(null);
            pieceHistoriqueRepo.insertHistoriqueNative(
                    "AUDIT_CORRECTION_DIRECTE",
                    LocalDateTime.now(),
                    "[" + inventaire.getNom() + "] Stock corrigé manuellement par l'auditeur de " + stockEnBase + " à "
                            + nouveauStock,
                    ligne.getPiece().getId(),
                    userId);
        }

        // On utilise l'update native pour la ligne d'inventaire pour assurer
        // l'atomicité
        ligneInventaireRepo.updateLigneStockNative(ligneId, nouveauStock, ligne.getEcart(), LigneStatut.VALIDE.name());

        // --- NOTIFICATION ET ALERTES ---
        try {
            String pieceName = (ligne.getPiece() != null) ? ligne.getPiece().getDesignation() : "Pièce inconnue";

            // 1. Notification de correction audit
            notificationService.createNotificationForRoles(
                    "Correction d'Audit : " + pieceName,
                    "L'auditeur a corrigé manuellement le stock de '" + pieceName + "' de " + stockEnBase + " vers "
                            + nouveauStock + ".",
                    com.gestionStock.backend.entity.notification.NotificationType.INFO,
                    List.of(com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR,
                            com.gestionStock.backend.entity.user.Role.RESPONSABLE_LOGISTIQUE),
                    ligne.getPiece() != null ? ligne.getPiece().getId() : null);

            // 2. Alerte Stock (Bas ou Rupture)
            if (ligne.getPiece() != null) {
                int minSeuil = (ligne.getPiece().getSeuilMinimum() != null) ? ligne.getPiece().getSeuilMinimum() : 0;
                if (nouveauStock <= 0) {
                    notificationService.createNotificationForRoles(
                            "Rupture après Audit : " + pieceName,
                            "ALERTE : La correction d'audit a confirmé une RUPTURE DE STOCK pour '" + pieceName + "'.",
                            com.gestionStock.backend.entity.notification.NotificationType.RUPTURE_STOCK,
                            List.of(com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR,
                                    com.gestionStock.backend.entity.user.Role.RESPONSABLE_LOGISTIQUE),
                            ligne.getPiece().getId());
                } else if (nouveauStock < minSeuil) {
                    notificationService.createNotificationForRoles(
                            "Stock Bas après Audit : " + pieceName,
                            "La correction d'audit place '" + pieceName + "' sous son seuil minimum (" + nouveauStock
                                    + " / " + minSeuil + ").",
                            com.gestionStock.backend.entity.notification.NotificationType.WARNING,
                            List.of(com.gestionStock.backend.entity.user.Role.ADMINISTRATEUR,
                                    com.gestionStock.backend.entity.user.Role.RESPONSABLE_LOGISTIQUE),
                            ligne.getPiece().getId());
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi des notifications d'audit: " + e.getMessage());
        }

        return getById(inventaireId);
    }

    public void delete(Long id) {
        Inventaire inventaire = getById(id);
        if (inventaire.isEstValide() || inventaire.isEstTermine()) {
            throw new IllegalStateException("Impossible de supprimer un inventaire validé ou terminé");
        }
        inventaireRepo.delete(inventaire);
    }

    public List<com.gestionStock.backend.entity.piece.PieceHistorique> getCorrectionHistoriques() {
        return pieceHistoriqueRepo.findByActionOrderByDateDesc("AUDIT_CORRECTION_DIRECTE");
    }

    private void addHistoryToLigne(LigneInventaire ligne, String action, String details,
            Integer fromVal, Integer toVal,
            LigneStatut fromStatus, LigneStatut toStatus,
            User actingUser) {

        User user = (actingUser != null) ? actingUser : userService.getCurrentUser().orElse(null);

        LigneInventaireHistorique h = LigneInventaireHistorique.builder()
                .date(LocalDateTime.now())
                .action(action)
                .details(details)
                .ancienneValeur(fromVal)
                .nouvelleValeur(toVal)
                .ancienStatut(fromStatus)
                .nouveauStatut(toStatus)
                .utilisateur(user)
                .ligneInventaire(ligne)
                .build();

        // On l'ajoute à la liste pour le cascade ou on le sauve directement
        if (ligne.getHistorique() == null) {
            ligne.setHistorique(new ArrayList<>());
        }
        ligne.getHistorique().add(h);
        ligneHistoriqueRepo.save(h);
    }
}
