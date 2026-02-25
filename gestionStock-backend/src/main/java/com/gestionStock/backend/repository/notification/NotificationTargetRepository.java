package com.gestionStock.backend.repository.notification;

import com.gestionStock.backend.entity.notification.NotificationTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationTargetRepository extends JpaRepository<NotificationTarget, Long> {

    @Query("SELECT nt FROM NotificationTarget nt WHERE nt.user.id = :userId ORDER BY nt.notification.date DESC")
    List<NotificationTarget> findByUserIdOrderByDateDesc(@Param("userId") String userId);

    @Query("SELECT nt FROM NotificationTarget nt WHERE nt.lu = false AND nt.user.id = :userId ORDER BY nt.notification.date DESC")
    List<NotificationTarget> findByLuFalseAndUserIdOrderByDateDesc(@Param("userId") String userId);

    @Query("SELECT nt FROM NotificationTarget nt WHERE nt.notification.id = :notificationId AND nt.user.id = :userId")
    Optional<NotificationTarget> findByNotificationIdAndUserId(@Param("notificationId") Long notificationId,
            @Param("userId") String userId);
}
