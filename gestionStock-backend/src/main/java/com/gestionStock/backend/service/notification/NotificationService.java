package com.gestionStock.backend.service.notification;

import com.gestionStock.backend.entity.notification.Notification;
import com.gestionStock.backend.entity.notification.NotificationType;
import com.gestionStock.backend.entity.user.Role;
import com.gestionStock.backend.entity.user.User;
import com.gestionStock.backend.entity.notification.NotificationTarget;
import com.gestionStock.backend.repository.notification.NotificationRepository;
import com.gestionStock.backend.repository.notification.NotificationTargetRepository;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.repository.user.UserRepository;
import com.gestionStock.backend.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final NotificationTargetRepository targetRepo;
    private final UserRepository userRepository;
    private final PieceDetacheeRepository pieceRepository;
    private final UserService userService;

    public List<Notification> getNotificationsForUser(String userId) {
        return targetRepo.findByUserIdOrderByDateDesc(userId).stream().map(nt -> {
            Notification n = nt.getNotification();
            n.setLu(nt.isLu());
            return n;
        }).collect(Collectors.toList());
    }

    public List<Notification> getUnreadNotificationsForUser(String userId) {
        return targetRepo.findByLuFalseAndUserIdOrderByDateDesc(userId).stream().map(nt -> {
            Notification n = nt.getNotification();
            n.setLu(nt.isLu());
            return n;
        }).collect(Collectors.toList());
    }

    public void markAsRead(Long notificationId, String userId) {
        targetRepo.findByNotificationIdAndUserId(notificationId, userId).ifPresent(nt -> {
            nt.setLu(true);
            targetRepo.save(nt);
        });
    }

    public void markAllAsRead(String userId) {
        List<NotificationTarget> unreadTargets = targetRepo.findByLuFalseAndUserIdOrderByDateDesc(userId);
        for (NotificationTarget nt : unreadTargets) {
            nt.setLu(true);
        }
        targetRepo.saveAll(unreadTargets);
    }

    public void createNotificationForRoles(String titre, String message, NotificationType type, List<Role> roles,
            Long relatedId) {
        List<User> users = new java.util.ArrayList<>();
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = userService.getCurrentUserEntreprise();

        if (roles != null && !roles.isEmpty() && entreprise != null) {
            users.addAll(userRepository.findByRoleInAndEntreprise(roles, entreprise));
        }

        userService.getCurrentUser().ifPresent(users::add);

        java.util.Map<String, User> uniqueUsers = users.stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        System.out.println("NotificationForRoles: found " + uniqueUsers.size() + " targets " + uniqueUsers.keySet()
                + " for roles " + roles);

        Notification notification = Notification.builder()
                .titre(titre)
                .message(message)
                .type(type)
                .date(LocalDateTime.now())
                .build();

        for (User u : uniqueUsers.values()) {
            NotificationTarget nt = NotificationTarget.builder()
                    .notification(notification)
                    .user(u)
                    .lu(false)
                    .build();
            notification.getTargets().add(nt);
        }

        if (relatedId != null) {
            pieceRepository.findById(relatedId).ifPresent(piece -> {
                notification.getPieces().add(piece);
            });
        }

        notificationRepo.save(notification);
    }

    public void createNotification(String titre, String message, NotificationType type, String role, Long relatedId) {
        Notification notification = Notification.builder()
                .titre(titre)
                .message(message)
                .type(type)
                .date(LocalDateTime.now())
                .build();

        try {
            Role userRole = Role.valueOf(role);
            List<User> targetUsers = userRepository.findByRoleIn(List.of(userRole));
            for (User u : targetUsers) {
                NotificationTarget nt = NotificationTarget.builder()
                        .notification(notification)
                        .user(u)
                        .lu(false)
                        .build();
                notification.getTargets().add(nt);
            }
        } catch (Exception e) {

        }

        if (relatedId != null) {
            pieceRepository.findById(relatedId).ifPresent(piece -> {
                notification.getPieces().add(piece);
            });
        }

        notificationRepo.save(notification);
    }
}
