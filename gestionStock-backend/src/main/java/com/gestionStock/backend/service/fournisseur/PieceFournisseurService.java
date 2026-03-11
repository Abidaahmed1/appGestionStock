package com.gestionStock.backend.service.fournisseur;

import com.gestionStock.backend.entity.fournisseur.PieceFournisseur;
import com.gestionStock.backend.repository.fournisseur.PieceFournisseurRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class PieceFournisseurService {

    private final PieceFournisseurRepository repository;

    public List<PieceFournisseur> getAll() {
        return repository.findAll();
    }

    public Optional<PieceFournisseur> getById(Long id) {
        return repository.findById(id);
    }

    public List<PieceFournisseur> getByFournisseur(Long fournisseurId) {
        return repository.findByFournisseurId(fournisseurId);
    }

    public List<PieceFournisseur> getByPieceIds(List<Long> pieceIds) {
        return repository.findByPieceIdIn(pieceIds);
    }

    public PieceFournisseur save(PieceFournisseur pieceFournisseur) {
        Optional<PieceFournisseur> existing = repository.findByPieceIdAndFournisseurId(
                pieceFournisseur.getPiece().getId(),
                pieceFournisseur.getFournisseur().getId());

        if (existing.isPresent()) {
            PieceFournisseur toUpdate = existing.get();
            toUpdate.setPrixAchat(pieceFournisseur.getPrixAchat());
            toUpdate.setQteMinACommander(pieceFournisseur.getQteMinACommander());
            toUpdate.setTauxRemise(pieceFournisseur.getTauxRemise());
            toUpdate.setNbJoursLivraison(pieceFournisseur.getNbJoursLivraison());
            toUpdate.setEstPrincipale(pieceFournisseur.getEstPrincipale());
            toUpdate.setDateDebutValidite(pieceFournisseur.getDateDebutValidite());
            toUpdate.setDateFinValidite(pieceFournisseur.getDateFinValidite());
            return repository.save(toUpdate);
        }

        return repository.save(pieceFournisseur);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
