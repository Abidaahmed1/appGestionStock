package com.gestionStock.backend.exceptions;

/**
 * Exception métier pour les règles de gestion liées aux fournisseurs et
 * commandes :
 * - Prix unitaire = 0
 * - Date d'arrivée incohérente
 * - Plafond de numérotation mensuelle atteint
 * - Toute autre violation des règles fournisseur
 */
public class FournisseurException extends RuntimeException {

    public FournisseurException(String message) {
        super(message);
    }
}
