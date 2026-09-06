package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.School;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolRepository extends JpaRepository<School, Long> {

    boolean existsByName(String name);

    boolean existsByNameIgnoreCase(String name);

    List<School> findAllByOrderByNameAsc();

    List<School> findAllByEnabledTrueOrderByNameAsc();
}
