package com.warroom.server.config;

import com.warroom.server.entity.User;
import com.warroom.server.model.Role;
import com.warroom.server.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Slf4j
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Vérification de l'existence d'utilisateurs en base
        if (userRepository.count() == 0) {
            log.info("Base de données vide. Initialisation du compte administrateur par défaut...");

            // 2. Création de l'utilisateur admin (selon Section 1.7 du contrat)
            User admin = new User();
            admin.setUsername("admin");
            // On hache le mot de passe "admin" avec BCrypt via le passwordEncoder injecté
            admin.setPasswordHash(passwordEncoder.encode("admin"));
            admin.setFullName("Administrateur Système");
            admin.setRole(Role.ADMIN);
            admin.setEmail("admin@warroom.local");
            admin.setActive(true);
            admin.setFailedAttempts(0);

            // Note : le champ createdAt sera géré par l'annotation @PrePersist dans l'entité User

            // 3. Sauvegarde en base de données
            userRepository.save(admin);

            log.info("-------------------------------------------------------");
            log.info("COMPTE ADMIN CRÉÉ AVEC SUCCÈS !");
            log.info("Username : admin");
            log.info("Password : admin (À changer impérativement en production)");
            log.info("-------------------------------------------------------");
        } else {
            log.info("Des utilisateurs existent déjà en base. Initialisation annulée.");
        }
    }
}