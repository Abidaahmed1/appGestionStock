package com.gestionStock.backend.service.fournisseur;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.gestionStock.backend.entity.fournisseur.BonCommandeFournisseur;
import com.gestionStock.backend.repository.fournisseur.BonCommandeFournisseurRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class BonCommandeFournisseurPersistHelper {

    private final BonCommandeFournisseurRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public BonCommandeFournisseur persist(BonCommandeFournisseur bon) {
        return repository.save(bon);
    }
}
