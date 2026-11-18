package com.warroom.server.controller;

import com.warroom.server.dto.CreateUserRequest;
import com.warroom.server.dto.UserResponse;
import com.warroom.server.entity.User;
import com.warroom.server.model.Role;
import com.warroom.server.repository.UserRepository;
import com.warroom.server.service.AdminUserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final UserRepository userRepository;

    public AdminUserController(AdminUserService adminUserService, UserRepository userRepository) {
        this.adminUserService = adminUserService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request, Authentication authentication) {
        try {
            Role currentUserRole = extractRole(authentication);
            User admin = extractUser(authentication);

            UserResponse response = adminUserService.createUser(request, currentUserRole,
                    admin.getId(), admin.getFullName(), admin.getRole().name());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("déjà pris")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/disable")
    public ResponseEntity<?> disableUser(@PathVariable("userId") Long userId, Authentication authentication) {
        try {
            Role currentUserRole = extractRole(authentication);
            String currentUsername = authentication.getName();
            User admin = extractUser(authentication);

            adminUserService.disableUser(userId, currentUsername, currentUserRole,
                    admin.getId(), admin.getFullName(), admin.getRole().name());
            return ResponseEntity.ok(Map.of("message", "Compte désactivé avec succès."));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/enable")
    public ResponseEntity<?> enableUser(@PathVariable("userId") Long userId, Authentication authentication) {
        try {
            Role currentUserRole = extractRole(authentication);
            User admin = extractUser(authentication); // <-- AJOUT : On extrait l'utilisateur connecté

            // <-- CORRECTION : On passe les nouvelles variables au service
            adminUserService.enableUser(userId, currentUserRole,
                    admin.getId(), admin.getFullName(), admin.getRole().name());

            return ResponseEntity.ok(Map.of("message", "Compte réactivé avec succès."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    private Role extractRole(Authentication authentication) {
        String roleString = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth.startsWith("ROLE_"))
                .map(auth -> auth.replace("ROLE_", ""))
                .findFirst()
                .orElse("L1");
        return Role.valueOf(roleString);
    }

    private User extractUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Utilisateur introuvable"));
    }
}