package com.warroom.server.service;

import com.warroom.server.dto.LoginRequest;
import com.warroom.server.dto.UserResponse;
import com.warroom.server.entity.User;
import com.warroom.server.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse authenticateUser(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

            User user = userRepository.findByUsername(request.username()).orElseThrow();
            user.setFailedAttempts(0);
            user.setLockTime(null);
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            log.info("Connexion réussie pour l'utilisateur : {}", user.getUsername());

            // Remplacement de LoginResponse par UserResponse (Option A)
            return new UserResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getFullName(),
                    user.getRole().name(),
                    user.getEmail(),
                    user.isActive(),
                    user.getCreatedAt(),
                    user.getLastLoginAt()
            );

        } catch (LockedException e) {
            log.warn("Tentative de connexion sur un compte verrouillé : {}", request.username());
            throw e;

        } catch (BadCredentialsException e) {
            handleFailedLoginAttempt(request.username());
            throw e;
        }
    }

    private void handleFailedLoginAttempt(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            if (!user.isActive()) return;

            // CORRECTION DU BUG : Si le verrouillage précédent a expiré, on reset d'abord
            if (user.getLockTime() != null && user.getLockTime().plusSeconds(900).isBefore(Instant.now())) {
                user.setFailedAttempts(0);
                user.setLockTime(null);
            }

            user.setFailedAttempts(user.getFailedAttempts() + 1);

            if (user.getFailedAttempts() >= 5) {
                user.setLockTime(Instant.now());
                log.error("COMPTE VERROUILLÉ (Anti-Bruteforce) : {}", username);
            }

            userRepository.save(user);
        });
    }
}