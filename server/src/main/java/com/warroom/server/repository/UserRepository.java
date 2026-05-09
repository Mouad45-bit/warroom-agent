package com.warroom.server.repository;

import com.warroom.server.entity.User;
import com.warroom.server.model.Role; // N'oublie pas l'import
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    // NOUVEAU : Demande à PostgreSQL de compter directement
    long countByRoleAndActiveTrue(Role role);
}