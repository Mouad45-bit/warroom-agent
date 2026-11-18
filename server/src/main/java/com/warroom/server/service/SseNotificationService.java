package com.warroom.server.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class SseNotificationService {

    // On utilise CopyOnWriteArrayList pour gérer les connexions simultanées sans bug
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Enregistre un nouveau navigateur client
     */
    public SseEmitter subscribe() {
        // Timeout de 24h pour éviter les déconnexions intempestives
        SseEmitter emitter = new SseEmitter(24 * 60 * 60 * 1000L);

        this.emitters.add(emitter);

        // Nettoyage automatique en cas de déconnexion ou d'erreur
        emitter.onCompletion(() -> this.emitters.remove(emitter));
        emitter.onTimeout(() -> this.emitters.remove(emitter));
        emitter.onError((e) -> this.emitters.remove(emitter));

        return emitter;
    }

    /**
     * Envoie une alerte à tous les Dashboards connectés
     */
    public void broadcast(Object alert) {
        List<SseEmitter> deadEmitters = new ArrayList<>();

        this.emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("security-alert")
                        .data(alert));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        });

        this.emitters.removeAll(deadEmitters);
    }
}