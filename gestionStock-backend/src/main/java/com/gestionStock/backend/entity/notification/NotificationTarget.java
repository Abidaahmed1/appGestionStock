package com.gestionStock.backend.entity.notification;

import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
    @GeneratedValue(strategy = GenerationType.AUTO)
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
