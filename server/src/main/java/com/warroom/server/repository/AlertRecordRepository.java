package com.warroom.server.repository;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.model.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRecordRepository extends JpaRepository<AlertRecord, Long> , JpaSpecificationExecutor<AlertRecord> {
    // Alertes contextuelles : 10 dernières du même agent
    List<AlertRecord> findTop10ByAgent_AgentIdOrderByCreatedAtDesc(String agentId);

    // Compteurs pour le dashboard (Module 4)
    long countByStatus(AlertStatus status);
}