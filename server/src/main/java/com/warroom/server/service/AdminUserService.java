package com.warroom.server.service;

import com.warroom.server.dto.CreateUserRequest;
import com.warroom.server.dto.UserResponse;
import com.warroom.server.entity.User;
import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import com.warroom.server.model.Role;
import com.warroom.server.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionRegistry sessionRegistry;
    private final AuditService auditService;

    public AdminUserService(UserRepository userRepository,
                            PasswordEncoder passwordEncoder,
                            SessionRegistry sessionRegistry,
                            AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessionRegistry = sessionRegistry;
        this.auditService = auditService;
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }



    /**
     * Version avec contexte d'audit (appelée depuis le controller avec userId de l'admin).
     */
    @Transactional
    public UserResponse createUser(CreateUserRequest request, Role currentUserRole,
                                   Long adminUserId, String adminFullName, String adminRole) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Ce nom d'utilisateur est déjà pris.");
        }

        Role targetRole;
        try {
            targetRole = Role.valueOf(request.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Rôle invalide. Les rôles autorisés sont : L1, L2, MANAGER, ADMIN.");
        }

        if (currentUserRole == Role.MANAGER && (targetRole == Role.ADMIN || targetRole == Role.MANAGER)) {
            throw new AccessDeniedException("Vous ne pouvez créer que des comptes L1 et L2.");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName());
        user.setRole(targetRole);
        user.setEmail(request.email());
        user.setActive(true);
        user.setFailedAttempts(0);

        User savedUser = userRepository.save(user);
        log.info("Nouvel utilisateur créé : {} par un {}", savedUser.getUsername(), currentUserRole);

        // *** MODULE 6 — AUDIT USER_CREATED ***
        if (adminUserId != null) {
            auditService.log(adminUserId, adminFullName, adminRole,
                    AuditAction.USER_CREATED, AuditTargetType.USER,
                    savedUser.getId().toString(), savedUser.getUsername(), "Rôle : " + targetRole);
        }

        return mapToResponse(savedUser);
    }

    @Transactional
    public void disableUser(Long userId, String currentUsername, Role currentUserRole) {
        disableUser(userId, currentUsername, currentUserRole, null, null, null);
    }

    /**
     * Version avec contexte d'audit.
     */
    @Transactional
    public void disableUser(Long userId, String currentUsername, Role currentUserRole,
                            Long adminUserId, String adminFullName, String adminRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        if (user.getUsername().equals(currentUsername)) {
            throw new AccessDeniedException("Vous ne pouvez pas désactiver votre propre compte.");
        }

        if (currentUserRole == Role.MANAGER && (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER)) {
            throw new AccessDeniedException("Vous ne pouvez désactiver que des comptes L1 et L2.");
        }

        if (user.getRole() == Role.ADMIN) {
            long adminCount = userRepository.countByRoleAndActiveTrue(Role.ADMIN);
            if (adminCount <= 1) {
                throw new AccessDeniedException("Impossible : c'est le dernier compte administrateur actif.");
            }
        }

        user.setActive(false);
        userRepository.save(user);

        sessionRegistry.getAllPrincipals().stream()
                .filter(principal -> principal instanceof org.springframework.security.core.userdetails.User)
                .map(principal -> (org.springframework.security.core.userdetails.User) principal)
                .filter(principal -> principal.getUsername().equals(user.getUsername()))
                .forEach(principal -> {
                    List<SessionInformation> sessions = sessionRegistry.getAllSessions(principal, false);
                    for (SessionInformation session : sessions) {
                        session.expireNow();
                    }
                });

        log.warn("Compte désactivé et sessions tuées pour : {}", user.getUsername());

        // *** MODULE 6 — AUDIT USER_DISABLED ***
        if (adminUserId != null) {
            auditService.log(adminUserId, adminFullName, adminRole,
                    AuditAction.USER_DISABLED, AuditTargetType.USER,
                    userId.toString(), user.getUsername(), null);
        }





    }

    // NOUVEAU : Méthode de base (sans audit direct si besoin interne)
    @Transactional
    public void enableUser(Long userId, Role currentUserRole) {
        enableUser(userId, currentUserRole, null, null, null);
    }

    // NOUVEAU : La vraie méthode avec le contexte d'audit
    @Transactional
    public void enableUser(Long userId, Role currentUserRole,
                           Long adminUserId, String adminFullName, String adminRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        if (currentUserRole == Role.MANAGER && (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER)) {
            throw new AccessDeniedException("Vous ne pouvez réactiver que des comptes L1 et L2.");
        }

        user.setActive(true);
        user.setFailedAttempts(0);
        user.setLockTime(null);
        userRepository.save(user);

        log.info("Compte réactivé : {}", user.getUsername());

        // *** MODULE 6 — AUDIT USER_ENABLED ***
        if (adminUserId != null) {
            auditService.log(adminUserId, adminFullName, adminRole,
                    AuditAction.USER_ENABLED, AuditTargetType.USER,
                    userId.toString(), user.getUsername(), null);
        }
    }

    private UserResponse mapToResponse(User user) {
        return new UserResponse(
                user.getId(), user.getUsername(), user.getFullName(),
                user.getRole().name(), user.getEmail(), user.isActive(),
                user.getCreatedAt(), user.getLastLoginAt()
        );
    }
}
