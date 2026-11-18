package com.warroom.server.repository;

import com.warroom.server.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Notifications non lues d'un utilisateur, triées par date DESC, max 50
    List<Notification> findTop50ByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);

    // Toutes les notifications d'un utilisateur, triées par date DESC, max 50
    List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);

    // Compteur de non lues (pour le badge)
    long countByUserIdAndReadFalse(Long userId);
}