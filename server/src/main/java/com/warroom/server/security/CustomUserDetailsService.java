package com.warroom.server.security;

import com.warroom.server.entity.User;
import com.warroom.server.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class  CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // On cherche notre entité User
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));

        // On la convertit dans le format attendu par Spring Security
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(!user.isActive())
                .accountLocked(isAccountLocked(user))
                .build();
    }

    /**
     * Vérifie si le compte est actuellement sous pénalité anti-bruteforce.
     */
    private boolean isAccountLocked(User user) {
        if (user.getLockTime() == null) return false;

        // Verrouillé si lockTime + 15 minutes (900 secondes) est dans le futur par rapport à maintenant
        return user.getLockTime().plusSeconds(900).isAfter(Instant.now());
    }
}