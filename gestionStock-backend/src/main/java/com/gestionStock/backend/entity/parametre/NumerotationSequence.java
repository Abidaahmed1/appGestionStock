package com.gestionStock.backend.entity.parametre;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(uniqueConstraints = {
    @UniqueConstraint(columnNames = {"module", "entrepriseId", "period"})
})
public class NumerotationSequence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String module;

    @Column(nullable = false)
    private Long entrepriseId;

    @Column(nullable = false)
    private String period; // "GLOBAL", "YYYY", or "YYYY-MM"

    @Column(nullable = false)
    private Long currentVal;
}
