package com.warroom.server.controller;

import com.warroom.server.dto.CreateUserRequest;
import com.warroom.server.dto.UserResponse;
import com.warroom.server.model.Role;
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
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')") // Sécurise l'intégralité du contrôleur
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request, Authentication authentication) {
        try {
            Role currentUserRole = extractRole(authentication);
            UserResponse response = adminUserService.createUser(request, currentUserRole);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            // Différencie le 409 (Conflit de pseudo) du 400 (Rôle invalide) selon le contrat d'API
            if (e.getMessage().contains("déjà pris")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));

        } catch (AccessDeniedException e) {
            // Code 403 : Le Manager essaie de créer un Admin
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/disable")
    public ResponseEntity<?> disableUser(@PathVariable("userId") Long userId, Authentication authentication) {
        try {
            Role currentUserRole = extractRole(authentication);
            String currentUsername = authentication.getName();

            adminUserService.disableUser(userId, currentUsername, currentUserRole);

            return ResponseEntity.ok(Map.of("message", "Compte désactivé avec succès."));

        } catch (IllegalArgumentException e) {
            // Code 404 : L'utilisateur n'existe pas
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));

        } catch (AccessDeniedException e) {
            // Code 403 : Tentative de désactiver soi-même, un supérieur, ou le dernier admin
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/enable")
    public ResponseEntity<?> enableUser(@PathVariable("userId") Long userId, Authentication authentication) {
        try {
            Role currentUserRole = extractRole(authentication);
            adminUserService.enableUser(userId, currentUserRole);
            return ResponseEntity.ok(Map.of("message", "Compte réactivé avec succès."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Utilitaire privé pour extraire l'Enum Role à partir de l'objet Authentication de Spring Security.
     */
    private Role extractRole(Authentication authentication) {
        String roleString = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth.startsWith("ROLE_")) // Spring Security préfixe les rôles avec "ROLE_"
                .map(auth -> auth.replace("ROLE_", ""))
                .findFirst()
                .orElse("L1"); // Rôle par défaut par sécurité

        return Role.valueOf(roleString);
    }
}