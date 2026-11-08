package com.myskoolclub.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
public class MySkoolClubApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(MySkoolClubApplication.class, args);

        // A Cloud Run Job starts the same application in non-web migration mode.
        // Flyway and Hibernate validation finish before SpringApplication.run returns,
        // so a zero exit code means the Cloud SQL schema is ready for deployment.
        if (context.getEnvironment().getProperty(
                "app.database.migration-only", Boolean.class, false)) {
            System.exit(SpringApplication.exit(context));
        }
    }
}
