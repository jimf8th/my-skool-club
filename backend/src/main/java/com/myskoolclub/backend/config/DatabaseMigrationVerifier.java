package com.myskoolclub.backend.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Verifies the complete application schema after Flyway has run in the
 * pre-deployment Cloud Run migration job.
 */
@Component
@ConditionalOnProperty(name = "app.database.migration-only", havingValue = "true")
public class DatabaseMigrationVerifier implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationVerifier.class);
    private static final String SCHEMA_MANIFEST = "db/schema-manifest.txt";

    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationVerifier(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Set<String> requiredTables = loadRequiredTables();
        Set<String> existingTables = new TreeSet<>(jdbcTemplate.queryForList("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                """, String.class));

        Set<String> missingTables = new TreeSet<>(requiredTables);
        missingTables.removeAll(existingTables);
        if (!missingTables.isEmpty()) {
            throw new IllegalStateException(
                    "Cloud SQL schema is missing required tables: " + String.join(", ", missingTables));
        }

        String latestMigration = jdbcTemplate.queryForObject("""
                SELECT version
                FROM public.flyway_schema_history
                WHERE success = TRUE
                ORDER BY installed_rank DESC
                LIMIT 1
                """, String.class);

        log.info("Cloud SQL schema verified: {} application tables are present; latest Flyway migration is {}.",
                requiredTables.size(), latestMigration);
    }

    private Set<String> loadRequiredTables() throws IOException {
        ClassPathResource resource = new ClassPathResource(SCHEMA_MANIFEST);
        try (InputStream inputStream = resource.getInputStream();
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            Set<String> tables = new TreeSet<>();
            List<String> lines = reader.lines().toList();
            for (String line : lines) {
                String table = line.trim();
                if (!table.isEmpty() && !table.startsWith("#")) {
                    tables.add(table);
                }
            }
            if (tables.isEmpty()) {
                throw new IllegalStateException("The database schema manifest is empty");
            }
            return tables;
        }
    }
}
