package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.myskoolclub.backend.model.AppRole;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByGoogleSub(String googleSub);

    Optional<User> findByFirebaseUid(String firebaseUid);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findAllByEnabledTrueOrderByFirstNameAscLastNameAsc();

    List<User> findByAppRoleAndEnabledTrue(AppRole appRole);

    List<User> findAllByOrderByFirstNameAscLastNameAsc();

    List<User> findByEmailContainingIgnoreCaseOrderByFirstNameAscLastNameAsc(String email);
}
