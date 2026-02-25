package com.gestionStock.backend.controller.notification;

import com.gestionStock.backend.entity.notification.Notification;
import com.gestionStock.backend.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.gestionStock.backend.repository.user.UserRepository;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin("*")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private String getDbUserId(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        com.gestionStock.backend.entity.user.User dbUser = userRepository.findByEmail(email).orElse(null);
        return dbUser != null ? dbUser.getId() : jwt.getSubject();
    }

    @GetMapping("/my")
    public List<Notification> getMyNotifications(@AuthenticationPrincipal Jwt jwt) {
        return notificationService.getNotificationsForUser(getDbUserId(jwt));
    }

    @GetMapping("/my/unread")
    public List<Notification> getMyUnread(@AuthenticationPrincipal Jwt jwt) {
        return notificationService.getUnreadNotificationsForUser(getDbUserId(jwt));
    }

    @PutMapping("/my/{id}/read")
    public void markAsRead(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        notificationService.markAsRead(id, getDbUserId(jwt));
    }

    @PutMapping("/my/read-all")
    public void markAllAsRead(@AuthenticationPrincipal Jwt jwt) {
        notificationService.markAllAsRead(getDbUserId(jwt));
    }
}
