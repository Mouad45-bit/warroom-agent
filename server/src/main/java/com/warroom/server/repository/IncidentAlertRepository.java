package com.warroom.server.repository;

import com.warroom.server.entity.IncidentAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentAlertRepository extends JpaRepository<IncidentAlert, Long> {

    List<IncidentAlert> findByIncidentId(Long incidentId);

    boolean existsByAlertId(Long alertId);
}