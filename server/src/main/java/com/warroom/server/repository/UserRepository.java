package com.warroom.server.repository;

import com.warroom.server.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Utilisé par Spring Security pour trouver l'utilisateur lors du Login
    Optional<User> findByUsername(String username);

    // Utilisé lors de la création de compte pour vérifier si le pseudo est déjà pris
    boolean existsByUsername(String username);
}