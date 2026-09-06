package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    @Query("SELECT a FROM Announcement a JOIN FETCH a.school JOIN FETCH a.createdBy WHERE a.school.id = :schoolId ORDER BY a.createdAt DESC")
    List<Announcement> findBySchoolIdOrderByCreatedAtDesc(@Param("schoolId") Long schoolId);

    @Query("SELECT a FROM Announcement a JOIN FETCH a.school JOIN FETCH a.createdBy WHERE a.id = :id")
    Optional<Announcement> findByIdWithDetails(@Param("id") Long id);
}
