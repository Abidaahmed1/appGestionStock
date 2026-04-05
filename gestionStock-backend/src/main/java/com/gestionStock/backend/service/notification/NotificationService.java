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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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

    public void createNotificationForRoles(String titre, String message, NotificationType type, List<Role> roles) {
        createNotificationForRoles(titre, message, type, roles, null);
    }

    public void createNotificationForRoles(String titre, String message, NotificationType type, List<Role> roles,
            Long relatedId) {
        createNotificationForRolesAndEntreprise(titre, message, type, roles, relatedId, null);
    }

    public void createNotificationForRolesAndEntreprise(String titre, String message, NotificationType type, List<Role> roles,
            Long relatedId, com.gestionStock.backend.entity.entreprise.Entreprise providedEntreprise) {
        List<User> users = new ArrayList<>();
        com.gestionStock.backend.entity.entreprise.Entreprise entreprise = providedEntreprise;
        if (entreprise == null) {
            entreprise = userService.getCurrentUserEntreprise();
        }

        if (roles != null && !roles.isEmpty() && entreprise != null) {
            users.addAll(userRepository.findByRoleInAndEntreprise(roles, entreprise));
        }

        userService.getCurrentUser().ifPresent(users::add);

        java.util.Map<String, User> uniqueUsers = users.stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        Notification notification = Notification.builder()
                .titre(titre)
                .message(message)
                .type(type)
                .date(LocalDateTime.now())
                .targets(new HashSet<>())
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
                if (notification.getPieces() == null)
                    notification.setPieces(new HashSet<>());
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
                .targets(new HashSet<>())
                .build();

        try {
            Role userRole = Role.valueOf(role);
            List<User> targetUsers = userRepository.findByRoleIn(java.util.Arrays.asList(userRole));
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
                if (notification.getPieces() == null)
                    notification.setPieces(new HashSet<>());
                notification.getPieces().add(piece);
            });
        }

        notificationRepo.save(notification);
    }

    public void createNotificationForUser(String titre, String message, NotificationType type, User user,
            Long relatedId) {
        Notification notification = Notification.builder()
                .titre(titre)
                .message(message)
                .type(type)
                .date(LocalDateTime.now())
                .targets(new HashSet<>())
                .build();

        NotificationTarget nt = NotificationTarget.builder()
                .notification(notification)
                .user(user)
                .lu(false)
                .build();
        notification.getTargets().add(nt);

        if (relatedId != null) {
            pieceRepository.findById(relatedId).ifPresent(piece -> {
                if (notification.getPieces() == null)
                    notification.setPieces(new HashSet<>());
                notification.getPieces().add(piece);
            });
        }

        notificationRepo.save(notification);
    }
}
