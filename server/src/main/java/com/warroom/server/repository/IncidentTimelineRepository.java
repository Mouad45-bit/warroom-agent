package com.warroom.server.repository;

import com.warroom.server.entity.IncidentTimelineEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentTimelineRepository extends JpaRepository<IncidentTimelineEntry, Long> {

    // Timeline complète d'un incident, triée chronologiquement
    List<IncidentTimelineEntry> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);
}