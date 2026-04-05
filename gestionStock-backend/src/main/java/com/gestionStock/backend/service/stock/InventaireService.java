package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.entity.Stock.Inventaire;
import com.gestionStock.backend.entity.Stock.LigneInventaire;
import com.gestionStock.backend.entity.Stock.LigneStatut;
import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.stock.InventaireRepository;
import com.gestionStock.backend.service.user.UserService;
import com.gestionStock.backend.service.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Collections;

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
    private final PieceDetacheeRepository pieceRepo;
    private final UserService userService;
    private final MouvementStockService mouvementStockService;
    private final NotificationService notificationService;

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

    public Inventaire createFromRequest(com.gestionStock.backend.dto.stock.CreateInventaireRequest req) {
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
        if (req.getAffectations() != null && !req.getAffectations().isEmpty()) {
            List<Long> pieceIds = req.getAffectations().stream()
                    .map(com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation::getPieceId)
                    .collect(Collectors.toList());
            pieces = pieceRepo.findAllById(pieceIds);

            List<com.gestionStock.backend.entity.user.User> resps = req.getAffectations().stream()
                    .map(com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation::getResponsableId)
                    .filter(id -> id != null && !id.isEmpty()) // Safe filter for null IDs
                    .distinct()
                    .map(id -> userService.getUserById(id))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
            inventaire.setResponsables(resps);
        } else {
            pieces = pieceRepo.findByEntreprise(entreprise);
        }

        buildLignes(inventaire, pieces, req.getAffectations());
        Inventaire saved = inventaireRepo.save(inventaire);

        // Notify assigned logistics managers
        if (req.getAffectations() != null) {
            for (com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation aff : req
                    .getAffectations()) {
                if (aff.getResponsableId() != null && !aff.getResponsableId().isEmpty()) {
                    userService.getUserById(aff.getResponsableId()).ifPresent(resp -> {
                        notificationService.createNotificationForUser(
                                "Nouvel Inventaire Assigné",
                                "Vous avez été assigné pour scanner la pièce "
                                        + (pieces.stream().filter(p -> p.getId().equals(aff.getPieceId())).findFirst()
                                                .map(PieceDetachee::getDesignation).orElse(""))
                                        + " dans l'inventaire " + saved.getNom(),
                                com.gestionStock.backend.entity.notification.NotificationType.INFO,
                                resp,
                                aff.getPieceId());
                    });
                }
            }
        }

        return saved;
    }

    public Inventaire refuser(Long id, String motif) {
        Inventaire inventaire = getById(id);
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Impossible de refuser un inventaire déjà validé");
        }
        inventaire.setMotifRefus(motif);
        // On peut envisager de notifier les responsables ici
        return inventaireRepo.save(inventaire);
    }

    private void buildLignes(Inventaire inventaire, List<PieceDetachee> pieces,
            List<com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation> affectations) {
        List<LigneInventaire> lignes = pieces.stream().map(piece -> {
            LigneInventaire ligne = new LigneInventaire();
            ligne.setPiece(piece);
            ligne.setStockTheorique(piece.getQuantite() != null ? piece.getQuantite() : 0);
            ligne.setStockPhysique(null); // null means À SCANNER
            ligne.setEcart(null);
            ligne.setStatutLigne(LigneStatut.A_SCANNER);
            ligne.setDateInventaire(inventaire.getDate());
            ligne.setCreateurLigne(inventaire.getCreateur());
            ligne.setInventaire(inventaire);

            if (affectations != null) {
                com.gestionStock.backend.dto.stock.CreateInventaireRequest.LigneAffectation affectation = affectations
                        .stream()
                        .filter(a -> a.getPieceId().equals(piece.getId()))
                        .findFirst()
                        .orElse(null);
                if (affectation != null && affectation.getResponsableId() != null
                        && !affectation.getResponsableId().isEmpty()) {
                    userService.getUserById(affectation.getResponsableId()).ifPresent(ligne::setResponsableLogistique);
                }
            }

            return ligne;
        }).collect(Collectors.toList());
        inventaire.setLignes(lignes);
    }

    public Inventaire update(Long id, Inventaire updated) {
        Inventaire existing = getById(id);
        if (existing.isEstValide()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé");
        }

        // Mettre à jour les lignes (uniquement le stockPhysique et l'écart)
        if (updated.getLignes() != null) {
            for (LigneInventaire updatedLigne : updated.getLignes()) {
                LigneInventaire existingLigne = existing.getLignes().stream()
                        .filter(l -> l.getId() != null && l.getId().equals(updatedLigne.getId()))
                        .findFirst().orElse(null);

                if (existingLigne != null) {
                    existingLigne.setStockPhysique(updatedLigne.getStockPhysique());
                    if (updatedLigne.getStockPhysique() != null) {
                        existingLigne.setEcart(updatedLigne.getStockPhysique() - existingLigne.getStockTheorique());
                        if (existingLigne.getStatutLigne() == LigneStatut.A_SCANNER) {
                            existingLigne.setStatutLigne(LigneStatut.EN_ATTENTE_AUDIT);
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
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Inventaire déjà validé");
        }

        // Créer les mouvements de stock pour les écarts
        for (LigneInventaire ligne : inventaire.getLignes()) {
            Integer ecart = ligne.getEcart();
            if (ecart != null && ecart != 0) {
                MouvementStock mouvement = new MouvementStock();
                mouvement.setDate(LocalDateTime.now());
                mouvement.setTypeMouvement(
                        ecart > 0 ? TypeMouvement.ENTREE_INVENTAIRE : TypeMouvement.SORTIE_INVENTAIRE);

                LigneMouvement ligneMvt = new LigneMouvement();
                ligneMvt.setPiece(ligne.getPiece());
                ligneMvt.setQuantite(Math.abs(ecart));
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
        return inventaireRepo.save(inventaire);
    }

    public Inventaire demanderRecomptage(Long inventaireId, Long ligneId, String motif) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setTentativePrecedente(ligne.getStockPhysique());
        ligne.setMotifRecomptage(motif);

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
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        if (ligne.getEcart() != null && ligne.getEcart() != 0) {
            creerMouvementEcart(ligne);
        }
        ligne.setStatutLigne(LigneStatut.VALIDE);
        ligne.setEstValide(true);
        return inventaireRepo.save(inventaire);
    }

    public Inventaire refuserLigne(Long inventaireId, Long ligneId) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setStatutLigne(LigneStatut.REFUSE);
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
        ligneMvt.setMouvementStock(mouvement);

        mouvement.setLigneMouvement(List.of(ligneMvt));
        mouvementStockService.save(mouvement);
    }

    public Inventaire corrigerLigneManuellement(Long inventaireId, Long ligneId, Integer nouveauStock) {
        Inventaire inventaire = getById(inventaireId);
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Impossible de modifier un inventaire déjà validé");
        }
        LigneInventaire ligne = inventaire.getLignes().stream()
                .filter(l -> l.getId().equals(ligneId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Ligne non trouvée"));

        ligne.setStockPhysique(nouveauStock);
        ligne.setEcart(nouveauStock - ligne.getStockTheorique());
        ligne.setStatutLigne(LigneStatut.VALIDE);
        creerMouvementEcart(ligne);
        ligne.setEstValide(true);

        return inventaireRepo.save(inventaire);
    }

    public void delete(Long id) {
        Inventaire inventaire = getById(id);
        if (inventaire.isEstValide()) {
            throw new IllegalStateException("Impossible de supprimer un inventaire validé");
        }
        inventaireRepo.delete(inventaire);
    }
}
