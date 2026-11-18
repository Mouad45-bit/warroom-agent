package com.warroom.server.specification;

import com.warroom.server.entity.AuditLogEntry;
import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;

public class AuditLogSpecifications {

    private AuditLogSpecifications() {}

    public static Specification<AuditLogEntry> hasUserId(Long userId) {
        if (userId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("userId"), userId);
    }

    public static Specification<AuditLogEntry> hasActionTypeIn(List<AuditAction> actions) {
        if (actions == null || actions.isEmpty()) return null;
        return (root, query, cb) -> root.get("actionType").in(actions);
    }

    public static Specification<AuditLogEntry> hasTargetType(AuditTargetType targetType) {
        if (targetType == null) return null;
        return (root, query, cb) -> cb.equal(root.get("targetType"), targetType);
    }

    public static Specification<AuditLogEntry> createdAfter(Instant from) {
        if (from == null) return null;
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<AuditLogEntry> createdBefore(Instant to) {
        if (to == null) return null;
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }
}