package com.gestionStock.backend.entity.Stock;

import java.time.LocalDate;

import com.gestionStock.backend.entity.fournisseur.Fournisseur;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.entity.entreprise.Entreprise;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.*;
import lombok.*;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "numeroBon")
@ToString(exclude = "mouvement")
@Table(uniqueConstraints = {
		@UniqueConstraint(columnNames = { "numeroBon", "entreprise_id" })
}, indexes = {
		@Index(name = "idx_bon_entreprise_date", columnList = "entreprise_id, date"),
		@Index(name = "idx_bon_createur", columnList = "createur_id")
})
public class Bon {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@JsonIgnore
	@ManyToOne
	@JoinColumn(name = "entreprise_id")
	private Entreprise entreprise;

	@JsonFormat(pattern = "yyyy-MM-dd['T'HH:mm:ss[.SSS][XXX]]")
	private LocalDate date;

	@Column(nullable = false)
	private String numeroBon;

	@Enumerated(EnumType.STRING)
	private TypeBon typeBon;

	@ManyToOne
	@JoinColumn(name = "bon_origine_id")
	private Bon bonOrigine;

	@JsonManagedReference("bon_mvt")
	@OneToOne(mappedBy = "bon", cascade = CascadeType.ALL, orphanRemoval = true)
	private MouvementStock mouvement;

	@JsonIgnoreProperties({ "entreprise", "theme", "accentColor", "emailOrders", "emailStock", "pushAlerts" })
	@ManyToOne
	private User createur;

	@ManyToOne
	@JoinColumn(name = "fournisseur_id")
	private Fournisseur fournisseur;

	@Builder.Default
	@Column(nullable = false)
	private Boolean archived = false;

	@PrePersist
	@PreUpdate
	protected void onSave() {
		if (archived == null) {
			archived = false;
		}
	}
}
