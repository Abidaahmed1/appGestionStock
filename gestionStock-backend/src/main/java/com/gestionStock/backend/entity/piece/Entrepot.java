package com.gestionStock.backend.entity.piece;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@EqualsAndHashCode(of = { "adresse", "ville" })
@Entity
@ToString(exclude = "stocks")
public class Entrepot {
	public Entrepot() {
	}

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;
	private String adresse;
	private String nomEntrepot;
	private String ville;

	@JsonIgnore
	@OneToMany(mappedBy = "entrepot")
	private Set<Stock> stocks = new HashSet<>();
}
