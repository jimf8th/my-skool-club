package com.myskoolclub.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.type.filter.AnnotationTypeFilter;

class DatabaseSchemaManifestTests {

    @Test
    void everyJpaTableIsDeclaredInTheManifestAndCreatedByFlyway() throws Exception {
        Set<String> manifestTables = loadManifestTables();
        Set<String> entityTables = loadEntityTables();

        assertThat(manifestTables).containsExactlyInAnyOrderElementsOf(entityTables);

        StringBuilder migrations = new StringBuilder();
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        for (var resource : resolver.getResources("classpath*:db/migration/*.sql")) {
            migrations.append(resource.getContentAsString(StandardCharsets.UTF_8)).append('\n');
        }

        for (String table : manifestTables) {
            Pattern createTable = Pattern.compile(
                    "(?i)CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?" + Pattern.quote(table) + "\\s*\\(");
            assertThat(createTable.matcher(migrations).find())
                    .as("Flyway creates table %s", table)
                    .isTrue();
        }
    }

    private Set<String> loadManifestTables() throws Exception {
        ClassPathResource manifest = new ClassPathResource("db/schema-manifest.txt");
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(manifest.getInputStream(), StandardCharsets.UTF_8))) {
            Set<String> tables = new TreeSet<>();
            List<String> lines = reader.lines().toList();
            for (String line : lines) {
                String table = line.trim();
                if (!table.isEmpty() && !table.startsWith("#")) {
                    tables.add(table);
                }
            }
            return tables;
        }
    }

    private Set<String> loadEntityTables() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        Set<String> tables = new TreeSet<>();
        for (var candidate : scanner.findCandidateComponents("com.myskoolclub.backend.model")) {
            Class<?> entityClass = Class.forName(candidate.getBeanClassName());
            Table table = entityClass.getAnnotation(Table.class);
            assertThat(table)
                    .as("JPA entity %s declares @Table", entityClass.getSimpleName())
                    .isNotNull();
            tables.add(table.name());
        }
        return tables;
    }
}
