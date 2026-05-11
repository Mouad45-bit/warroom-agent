package com.warroom.server.specification;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;

public class AlertSpecifications {

    private AlertSpecifications() {} // classe utilitaire

    public static Specification<AlertRecord> hasSeverityIn(List<Severity> severities) {
        if (severities == null || severities.isEmpty()) return null;
        return (root, query, cb) -> root.get("severity").in(severities);
    }

    public static Specification<AlertRecord> hasStatusIn(List<AlertStatus> statuses) {
        if (statuses == null || statuses.isEmpty()) return null;
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<AlertRecord> hasAgentId(String agentId) {
        if (agentId == null || agentId.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("agent").get("agentId"), agentId);
    }

    public static Specification<AlertRecord> hasRuleId(String ruleId) {
        if (ruleId == null || ruleId.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("ruleId"), ruleId);
    }

    public static Specification<AlertRecord> createdAfter(Instant from) {
        if (from == null) return null;
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<AlertRecord> createdBefore(Instant to) {
        if (to == null) return null;
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }
}