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

	// 409 – Contrainte d'unicité violée (doublon en BDD)
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Erreur> handleDataIntegrity(DataIntegrityViolationException ex) {
		String message = "Un enregistrement avec ces données existe déjà (contrainte d'unicité). Veuillez réessayer.";
		Map<String, String> details = new HashMap<>();
		String cause = ex.getRootCause() != null ? ex.getRootCause().getMessage() : ex.getMessage();
		if (cause != null && !cause.isBlank()) {
			details.put("cause", cause);
		}
		Erreur e = new Erreur(LocalDateTime.now(), message, details.isEmpty() ? null : details,
				HttpStatus.CONFLICT.value());
		return new ResponseEntity<>(e, HttpStatus.CONFLICT);
	}

	// 500 – Erreur inattendue (filet de sécurité)
	@ExceptionHandler(Exception.class)
	public ResponseEntity<Erreur> handleUnexpected(Exception ex) {
		Erreur e = new Erreur(
				LocalDateTime.now(),
				"Une erreur interne est survenue. Veuillez contacter l'administrateur.",
				HttpStatus.INTERNAL_SERVER_ERROR.value());
		return new ResponseEntity<>(e, HttpStatus.INTERNAL_SERVER_ERROR);
	}
}
