package com.gestionStock.backend.entity.Stock;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

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
@ToString(exclude = { "ligneMouvement", "bon" })
public class MouvementStock {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][XXX]")
	private LocalDateTime date;

	private Double montantHTVA;
	private Double montantTTC;

	@Enumerated(EnumType.STRING)
	private TypeMouvement typeMouvement;

	@Builder.Default
	@JsonManagedReference
	@OneToMany(mappedBy = "mouvementStock", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<LigneMouvement> ligneMouvement = new ArrayList<>();

	@JsonIgnore
	@OneToOne
	private Bon bon;
}
