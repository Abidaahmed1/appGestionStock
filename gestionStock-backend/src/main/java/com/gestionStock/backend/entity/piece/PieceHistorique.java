package com.gestionStock.backend.entity.piece;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

import com.gestionStock.backend.entity.user.User;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PieceHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "piece_id")
    private PieceDetachee piece;

    private LocalDateTime date;

    @Column(columnDefinition = "TEXT")
    private String action;

    @Column(columnDefinition = "TEXT")
    private String details;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private User utilisateur;
}
