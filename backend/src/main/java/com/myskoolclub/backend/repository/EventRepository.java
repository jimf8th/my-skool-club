package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("SELECT e FROM Event e JOIN FETCH e.school JOIN FETCH e.createdBy WHERE e.school.id = :schoolId ORDER BY e.eventTime ASC")
    List<Event> findBySchoolIdOrderByEventTimeAsc(@Param("schoolId") Long schoolId);

    @Query("SELECT e FROM Event e JOIN FETCH e.school JOIN FETCH e.createdBy WHERE e.id = :id")
    Optional<Event> findByIdWithDetails(@Param("id") Long id);
}
