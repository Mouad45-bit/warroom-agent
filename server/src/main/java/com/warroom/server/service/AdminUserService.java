package com.warroom.server.service;

import com.warroom.server.dto.CreateUserRequest;
import com.warroom.server.dto.UserResponse;
import com.warroom.server.entity.User;
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

    public AdminUserService(UserRepository userRepository, PasswordEncoder passwordEncoder, SessionRegistry sessionRegistry) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessionRegistry = sessionRegistry;
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request, Role currentUserRole) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Ce nom d'utilisateur est déjà pris.");
        }

        // CORRECTION 2 : Try-catch pour gérer les rôles invalides sans crasher
        Role targetRole;
        try {
            targetRole = Role.valueOf(request.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Rôle invalide. Les rôles autorisés sont : L1, L2, MANAGER, ADMIN.");
        }

        // Règle : Un MANAGER ne peut créer que des L1 ou L2
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
        return mapToResponse(savedUser);
    }

    @Transactional
    public void disableUser(Long userId, String currentUsername, Role currentUserRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));

        if (user.getUsername().equals(currentUsername)) {
            throw new AccessDeniedException("Vous ne pouvez pas désactiver votre propre compte.");
        }

        if (currentUserRole == Role.MANAGER && (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER)) {
            throw new AccessDeniedException("Vous ne pouvez désactiver que des comptes L1 et L2.");
        }

        // CORRECTION 1 : Requête SQL optimisée au lieu de charger toute la RAM
        if (user.getRole() == Role.ADMIN) {
            long adminCount = userRepository.countByRoleAndActiveTrue(Role.ADMIN);
            if (adminCount <= 1) {
                throw new AccessDeniedException("Impossible : c'est le dernier compte administrateur actif.");
            }
        }

        // Désactivation en base de données
        user.setActive(false);
        userRepository.save(user);

        // --- LA MAGIE : DÉCONNEXION EN TEMPS RÉEL ---
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
    }

    @Transactional
    public void enableUser(Long userId, Role currentUserRole) {
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
    }

    private UserResponse mapToResponse(User user) {
        return new UserResponse(
                user.getId(), user.getUsername(), user.getFullName(),
                user.getRole().name(), user.getEmail(), user.isActive(),
                user.getCreatedAt(), user.getLastLoginAt()
        );
    }
}