package com.warroom.server.repository;

import com.warroom.server.entity.SecurityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {
    // La clé primaire est un Long (id généré automatiquement)
}