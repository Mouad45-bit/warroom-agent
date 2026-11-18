package com.warroom.server.entity;

import com.warroom.server.model.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "users") // Crucial pour éviter le conflit avec le mot-clé réservé de PostgreSQL
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String passwordHash; // On stockera uniquement le hash BCrypt

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING) // Stocke "L1", "ADMIN" en texte clair dans la BDD, plus lisible
    @Column(nullable = false)
    private Role role;

    private String email;

    @Column(nullable = false)
    private boolean active = true;

    // --- Champs pour la sécurité Anti-Bruteforce ---

    @Column(nullable = false)
    private int failedAttempts = 0;

    private Instant lockTime; // Horodatage du blocage (pour la pénalité de 15 minutes)

    // --- Champs d'audit ---

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant lastLoginAt;

    /**
     * Méthode exécutée automatiquement par Hibernate juste avant le premier INSERT.
     * Garantit que la date de création est toujours remplie.
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}