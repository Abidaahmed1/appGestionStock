package com.gestionStock.backend.controller.stock;

import com.gestionStock.backend.dto.stock.CreateInventaireRequest;
import com.gestionStock.backend.entity.Stock.Inventaire;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.service.stock.InventaireService;
import com.gestionStock.backend.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventaires")
@RequiredArgsConstructor
@CrossOrigin("*")
public class InventaireController {

    private final InventaireService inventaireService;
    private final PieceDetacheeRepository pieceDetacheeRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Inventaire>> getAll() {
        return ResponseEntity.ok(inventaireService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inventaire> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inventaireService.getById(id));
    }

    /**
     * Returns the list of all pieces available for selection when creating an
     * inventory
     */
    @GetMapping("/pieces-disponibles")
    public ResponseEntity<List<PieceDetachee>> getPiecesDisponibles() {
        Entreprise entreprise = userService.getCurrentUserEntreprise();
        if (entreprise == null)
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(pieceDetacheeRepository.findByArchiveeAndEntreprise(false, entreprise));
    }

    @PostMapping
    public ResponseEntity<Inventaire> create(@RequestBody Inventaire inventaire) {
        return ResponseEntity.ok(inventaireService.create(inventaire));
    }

    /** New endpoint: creates an inventory with optional specific piece IDs */
    @PostMapping("/from-request")
    public ResponseEntity<Inventaire> createFromRequest(@RequestBody CreateInventaireRequest req) {
        return ResponseEntity.ok(inventaireService.createFromRequest(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Inventaire> update(@PathVariable Long id, @RequestBody Inventaire inventaire) {
        return ResponseEntity.ok(inventaireService.update(id, inventaire));
    }

    @PostMapping("/{id}/valider")
    public ResponseEntity<Inventaire> valider(@PathVariable Long id) {
        return ResponseEntity.ok(inventaireService.valider(id));
    }

    @PostMapping("/{id}/refuser")
    public ResponseEntity<Inventaire> refuser(@PathVariable Long id,
            @RequestBody com.gestionStock.backend.dto.stock.RefuseInventaireRequest req) {
        return ResponseEntity.ok(inventaireService.refuser(id, req.getCommentaire()));
    }

    @PostMapping("/{id}/lignes/{ligneId}/recompter")
    public ResponseEntity<Inventaire> demanderRecomptage(@PathVariable Long id, @PathVariable Long ligneId,
            @RequestBody java.util.Map<String, String> body) {
        String motif = body != null ? body.get("motif") : null;
        return ResponseEntity.ok(inventaireService.demanderRecomptage(id, ligneId, motif));
    }

    @PostMapping("/{id}/lignes/{ligneId}/refuser")
    public ResponseEntity<Inventaire> refuserLigne(@PathVariable Long id, @PathVariable Long ligneId) {
        return ResponseEntity.ok(inventaireService.refuserLigne(id, ligneId));
    }

    @PostMapping("/{id}/lignes/{ligneId}/valider")
    public ResponseEntity<Inventaire> validerLigne(@PathVariable Long id, @PathVariable Long ligneId) {
        return ResponseEntity.ok(inventaireService.validerLigne(id, ligneId));
    }

    @PostMapping("/{id}/lignes/{ligneId}/corriger")
    public ResponseEntity<Inventaire> corrigerLigneManuellement(@PathVariable Long id, @PathVariable Long ligneId,
            @RequestParam Integer nouveauStock) {
        return ResponseEntity.ok(inventaireService.corrigerLigneManuellement(id, ligneId, nouveauStock));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inventaireService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
