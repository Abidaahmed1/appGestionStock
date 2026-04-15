package com.gestionStock.backend.exceptions;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import jakarta.persistence.EntityNotFoundException;

@RestControllerAdvice
public class GlobalArticleExceptionHandler extends ResponseEntityExceptionHandler {
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(
			MethodArgumentNotValidException ex,
			HttpHeaders headers,
			HttpStatusCode status,
			WebRequest request) {

		Map<String, String> details = new HashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(err -> details.put(err.getField(), err.getDefaultMessage()));

		Erreur erreur = new Erreur(
				LocalDateTime.now(),
				"Validation des données échouée",
				details,
				HttpStatus.BAD_REQUEST.value());

		return new ResponseEntity<>(erreur, HttpStatus.BAD_REQUEST);
	}

	// 400 – Règles métier fournisseur
	@ExceptionHandler(FournisseurException.class)
	public ResponseEntity<Erreur> handleFournisseurException(FournisseurException ex) {
		Erreur e = new Erreur(LocalDateTime.now(), ex.getMessage(), HttpStatus.BAD_REQUEST.value());
		return new ResponseEntity<>(e, HttpStatus.BAD_REQUEST);
	}

	// 400 – Règles métier pièces détachées
	@ExceptionHandler(PieceException.class)
	public ResponseEntity<Erreur> handlePieceException(PieceException ex) {
		Erreur e = new Erreur(LocalDateTime.now(), ex.getMessage(), HttpStatus.BAD_REQUEST.value());
		return new ResponseEntity<>(e, HttpStatus.BAD_REQUEST);
	}

	// 400 – Règles métier produits finis
	@ExceptionHandler(ProduitException.class)
	public ResponseEntity<Erreur> handleProduitException(ProduitException ex) {
		Erreur e = new Erreur(LocalDateTime.now(), ex.getMessage(), HttpStatus.BAD_REQUEST.value());
		return new ResponseEntity<>(e, HttpStatus.BAD_REQUEST);
	}

	// 400 – Autres violations de règles métier génériques
	@ExceptionHandler({ IllegalArgumentException.class, IllegalStateException.class })
	public ResponseEntity<Erreur> handleBusinessRules(RuntimeException ex) {
		Erreur e = new Erreur(LocalDateTime.now(), ex.getMessage(), HttpStatus.BAD_REQUEST.value());
		return new ResponseEntity<>(e, HttpStatus.BAD_REQUEST);
	}

	// 404 – Ressource introuvable
	@ExceptionHandler(EntityNotFoundException.class)
	public ResponseEntity<Erreur> handleEntityNotFound(EntityNotFoundException ex) {
		Erreur e = new Erreur(LocalDateTime.now(), ex.getMessage(), HttpStatus.NOT_FOUND.value());
		return new ResponseEntity<>(e, HttpStatus.NOT_FOUND);
	}

	// 409 – Contrainte d'intégrité violée (doublon, null, ou référence)
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Erreur> handleDataIntegrity(DataIntegrityViolationException ex) {
		ex.printStackTrace(); // Debug: Voir la cause exacte dans la console Java
		String cause = ex.getRootCause() != null ? ex.getRootCause().getMessage() : ex.getMessage();
		String message = "Erreur d'intégrité : " + cause;

		Map<String, String> details = new HashMap<>();
		if (cause != null && !cause.isBlank()) {
			details.put("cause", cause);
			if (cause.contains("violates unique constraint")) {
				message = "Un enregistrement avec ces données existe déjà.";
			} else if (cause.contains("violates foreign key constraint")) {
				message = "Impossible de supprimer ou modifier cet élément car il est utilisé par d'autres données (ex: une pièce détachée).";
			} else if (cause.contains("violates not-null constraint")) {
				message = "Un champ obligatoire est manquant.";
			} else if (cause.contains("piece_detachee_quantite_check") || cause.contains("violates check constraint")) {
				message = "Opération impossible : Le stock résultant deviendrait négatif. Le stock de la pièce a probablement changé pendant l'audit.";
			}
		}

		Erreur e = new Erreur(LocalDateTime.now(), message, details.isEmpty() ? null : details,
				HttpStatus.CONFLICT.value());
		return new ResponseEntity<>(e, HttpStatus.CONFLICT);
	}

	// 403 – Accès refusé (Spring Security)
	@ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
	public ResponseEntity<Erreur> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
		Erreur e = new Erreur(
				LocalDateTime.now(),
				"Accès refusé : vous n'avez pas les permissions nécessaires pour cette action.",
				HttpStatus.FORBIDDEN.value());
		return new ResponseEntity<>(e, HttpStatus.FORBIDDEN);
	}

	// 400 – Erreur de lecture JSON (Jackson failure) - Overriding
	// ResponseEntityExceptionHandler method
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(
			org.springframework.http.converter.HttpMessageNotReadableException ex,
			HttpHeaders headers,
			HttpStatusCode status,
			WebRequest request) {
		String msg = "Erreur de lecture de la requête (JSON mal formé ou types incompatibles) : "
				+ ex.getMostSpecificCause().getMessage();
		Erreur e = new Erreur(LocalDateTime.now(), msg, HttpStatus.BAD_REQUEST.value());
		return new ResponseEntity<>(e, HttpStatus.BAD_REQUEST);
	}

	// 500 – Erreur inattendue (filet de sécurité)
	@ExceptionHandler(Exception.class)
	public ResponseEntity<Erreur> handleUnexpected(Exception ex) {
		String msg = "Erreur interne : " + ex.getMessage();
		Erreur e = new Erreur(
				LocalDateTime.now(),
				msg,
				HttpStatus.INTERNAL_SERVER_ERROR.value());
		return new ResponseEntity<>(e, HttpStatus.INTERNAL_SERVER_ERROR);
	}
}
