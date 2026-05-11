package com.warroom.server.service;

import com.warroom.server.entity.AuditLogEntry;
import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import com.warroom.server.repository.AuditLogRepository;
import com.warroom.server.specification.AuditLogSpecifications;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Méthode centrale — appelée depuis tous les services.
     */
    public void log(Long userId, String userFullName, String userRole,
                    AuditAction action, AuditTargetType targetType,
                    String targetId, String targetLabel, String details) {
        AuditLogEntry entry = new AuditLogEntry();
        entry.setUserId(userId);
        entry.setUserFullName(userFullName);
        entry.setUserRole(userRole);
        entry.setActionType(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setTargetLabel(targetLabel);
        entry.setDetails(details);
        auditLogRepository.save(entry);
    }

    /**
     * Lecture paginée avec filtres dynamiques.
     * GET /api/admin/audit-log
     */
    public Page<AuditLogEntry> getAuditLog(int page, int size,
                                           Long userId,
                                           List<AuditAction> actionTypes,
                                           AuditTargetType targetType,
                                           Instant from, Instant to) {

        Specification<AuditLogEntry> spec = Specification.where(null);

        Specification<AuditLogEntry> userSpec = AuditLogSpecifications.hasUserId(userId);
        if (userSpec != null) spec = spec.and(userSpec);

        Specification<AuditLogEntry> actionSpec = AuditLogSpecifications.hasActionTypeIn(actionTypes);
        if (actionSpec != null) spec = spec.and(actionSpec);

        Specification<AuditLogEntry> targetSpec = AuditLogSpecifications.hasTargetType(targetType);
        if (targetSpec != null) spec = spec.and(targetSpec);

        Specification<AuditLogEntry> fromSpec = AuditLogSpecifications.createdAfter(from);
        if (fromSpec != null) spec = spec.and(fromSpec);

        Specification<AuditLogEntry> toSpec = AuditLogSpecifications.createdBefore(to);
        if (toSpec != null) spec = spec.and(toSpec);

        Sort sort = Sort.by(Sort.Order.desc("createdAt"));
        return auditLogRepository.findAll(spec, PageRequest.of(page, size, sort));
    }
}