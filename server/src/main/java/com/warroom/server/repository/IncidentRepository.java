// === IncidentRepository.java ===
package com.warroom.server.repository;

import com.warroom.server.entity.Incident;
import com.warroom.server.model.IncidentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Optional<Incident> findByIncidentNumber(String incidentNumber);

    Page<Incident> findByAssignedToUserId(Long userId, Pageable pageable);

    Page<Incident> findByStatusIn(List<IncidentStatus> statuses, Pageable pageable);

    Page<Incident> findByCreatedByUserId(Long userId, Pageable pageable);

    // Compteur pour générer INC-0001, INC-0002, ...
    long count();

    // Compteurs pour le dashboard (Module 4)
    long countByStatus(IncidentStatus status);
}