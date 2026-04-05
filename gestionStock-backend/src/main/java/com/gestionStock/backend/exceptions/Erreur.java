package com.gestionStock.backend.exceptions;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@RequiredArgsConstructor
public class Erreur {
	@NonNull
	private LocalDateTime timestamp;
	@NonNull
	private String message;
	private Map<String, String> details;
	@NonNull
	private int status;
}
