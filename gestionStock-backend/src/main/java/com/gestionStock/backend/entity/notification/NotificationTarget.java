package com.gestionStock.backend.entity.notification;

import com.gestionStock.backend.entity.user.User;
import jakarta.persistence.*;
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
@EqualsAndHashCode(of = { "notification", "user" })
@Table(name = "notification_targets")
public class NotificationTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "notif_target_seq")
    @SequenceGenerator(name = "notif_target_seq", sequenceName = "notif_target_id_seq", allocationSize = 1, initialValue = 1000000)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonBackReference("notif_targets")
    @ManyToOne
    @JoinColumn(name = "notification_id")
    private Notification notification;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Builder.Default
    private boolean lu = false;
}
