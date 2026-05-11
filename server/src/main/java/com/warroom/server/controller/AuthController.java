package com.warroom.server.controller;

import com.warroom.server.dto.LoginRequest;
import com.warroom.server.dto.UserResponse;
import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import com.warroom.server.repository.UserRepository;
import com.warroom.server.service.AuditService;
import com.warroom.server.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AuthController(AuthService authService, UserRepository userRepository , AuditService auditService) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            UserResponse response = authService.authenticateUser(request, httpRequest, httpResponse);
            return ResponseEntity.ok(response);

        } catch (LockedException e) {
            return ResponseEntity.status(423).body(Map.of("message", "Compte temporairement verrouillé. Réessayez dans 15 minutes."));

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Identifiants invalides."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, Authentication auth) { // AJOUTE Authentication
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            userRepository.findByUsername(auth.getName()).ifPresent(user -> {
                auditService.log(user.getId(), user.getFullName(), user.getRole().name(),
                        AuditAction.LOGOUT, AuditTargetType.SESSION,
                        request.getSession().getId(), "Session Web", "Déconnexion réussie");
            });
        }
        SecurityContextHolder.clearContext();
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Déconnexion réussie."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Pas de session active."));
        }

        return userRepository.findByUsername(authentication.getName())
                .map(user -> ResponseEntity.ok(new UserResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getFullName(),
                        user.getRole().name(),
                        user.getEmail(),
                        user.isActive(),
                        user.getCreatedAt(),
                        user.getLastLoginAt()
                )))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
}