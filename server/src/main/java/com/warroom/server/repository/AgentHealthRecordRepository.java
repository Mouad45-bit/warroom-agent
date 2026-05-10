package com.warroom.server.repository;

import com.warroom.server.entity.AgentHealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentHealthRecordRepository extends JpaRepository<AgentHealthRecord, Long> {

    // Pour le détail : Les 20 derniers heartbeats
    List<AgentHealthRecord> findTop20ByAgent_AgentIdOrderByTimestampDesc(String agentId);

    // Pour le résumé (liste) : Le tout dernier heartbeat pour extraire les collecteurs
    Optional<AgentHealthRecord> findFirstByAgent_AgentIdOrderByTimestampDesc(String agentId);
}