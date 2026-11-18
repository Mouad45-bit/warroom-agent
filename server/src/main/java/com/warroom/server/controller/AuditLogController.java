package com.warroom.server.controller;

import com.warroom.server.entity.AuditLogEntry;
import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import com.warroom.server.service.AuditService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin/audit-log")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class AuditLogController {

    private final AuditService auditService;

    public AuditLogController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<Page<AuditLogEntry>> getAuditLog(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "30") int size,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "actionType", required = false) List<AuditAction> actionType,
            @RequestParam(value = "targetType", required = false) AuditTargetType targetType,
            @RequestParam(value = "from", required = false) Instant from,
            @RequestParam(value = "to", required = false) Instant to) {

        return ResponseEntity.ok(
                auditService.getAuditLog(page, size, userId, actionType, targetType, from, to)
        );
    }
}