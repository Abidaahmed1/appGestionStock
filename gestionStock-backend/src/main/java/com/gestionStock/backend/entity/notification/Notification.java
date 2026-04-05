package com.gestionStock.backend.entity.notification;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Transient;
import jakarta.persistence.CascadeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@EqualsAndHashCode(of = "id")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String titre;
    private String message;
    private LocalDateTime date;

    @Transient
    @Builder.Default
    private boolean lu = false;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonManagedReference("notif_targets")
    private Set<NotificationTarget> targets = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "notification_piece", joinColumns = @jakarta.persistence.JoinColumn(name = "notification_id"), inverseJoinColumns = @jakarta.persistence.JoinColumn(name = "piece_id"))
    @JsonIgnore
    @Builder.Default
    private Set<PieceDetachee> pieces = new HashSet<>();
}
