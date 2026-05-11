package com.warroom.server.service;

import com.warroom.server.entity.Notification;
import com.warroom.server.model.NotificationType;
import com.warroom.server.repository.NotificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * Crée et persiste une notification.
     * Appelé depuis IncidentService lors des actions clés.
     */
    public void notify(Long userId, NotificationType type, String message, Long relatedIncidentId) {
        Notification notif = new Notification(userId, type, message, relatedIncidentId);
        notificationRepository.save(notif);
        log.info("Notification [{}] envoyée à userId={} : {}", type, userId, message);
    }

    /**
     * Récupère les notifications d'un utilisateur.
     */
    public List<Notification> getNotifications(Long userId, boolean unreadOnly) {
        if (unreadOnly) {
            return notificationRepository.findTop50ByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        }
        return notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Marque une notification comme lue.
     * Vérifie que la notification appartient bien à l'utilisateur.
     */
    @Transactional
    public void markAsRead(Long notifId, Long userId) {
        Notification notif = notificationRepository.findById(notifId)
                .orElseThrow(() -> new IllegalArgumentException("Notification introuvable"));

        if (!notif.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Cette notification ne vous appartient pas");
        }

        notif.setRead(true);
        notificationRepository.save(notif);
    }

    /**
     * Compteur de notifications non lues (pour le badge).
     */
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }
}