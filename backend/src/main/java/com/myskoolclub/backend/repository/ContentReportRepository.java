package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.ContentReport;
import com.myskoolclub.backend.model.ContentReportStatus;
import com.myskoolclub.backend.model.ReportContentType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ContentReportRepository extends JpaRepository<ContentReport, Long> {

    @EntityGraph(attributePaths = {"reporter", "contentAuthor", "reviewedBy"})
    List<ContentReport> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"reporter", "contentAuthor", "reviewedBy"})
    List<ContentReport> findByStatusOrderByCreatedAtDesc(ContentReportStatus status);

    @EntityGraph(attributePaths = {"reporter", "contentAuthor", "reviewedBy"})
    List<ContentReport> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    boolean existsByReporterIdAndContentTypeAndContentIdAndStatusIn(
            Long reporterId,
            ReportContentType contentType,
            Long contentId,
            Collection<ContentReportStatus> statuses
    );

    long countByReporterIdAndCreatedAtAfter(Long reporterId, LocalDateTime createdAt);
}
