package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.model.SchoolTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClubRepository extends JpaRepository<Club, Long> {

    @Query("SELECT c FROM Club c JOIN FETCH c.school WHERE c.school.id = :schoolId ORDER BY c.name ASC")
    List<Club> findBySchoolIdOrderByNameAsc(@Param("schoolId") Long schoolId);

    boolean existsByNameAndSchoolId(String name, Long schoolId);

    @Query("SELECT c.school.tier FROM Club c WHERE c.id = :clubId")
    Optional<SchoolTier> findSchoolTierByClubId(@Param("clubId") Long clubId);
}
