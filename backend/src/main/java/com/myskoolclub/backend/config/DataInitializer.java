package com.myskoolclub.backend.config;

import com.myskoolclub.backend.model.Member;
import com.myskoolclub.backend.service.MemberService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Component
public class DataInitializer implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
    
    @Autowired
    private MemberService memberService;
    
    @Value("${app.admin.username:admin}")
    private String adminUsername;
    
    @Value("${app.admin.email:admin@myskoolclub.com}")
    private String adminEmail;
    
    @Value("${app.admin.password:Admin@123}")
    private String adminPassword;
    
    @Value("${app.admin.firstName:System}")
    private String adminFirstName;
    
    @Value("${app.admin.lastName:Administrator}")
    private String adminLastName;
    
    @Override
    public void run(String... args) throws Exception {
        createDefaultAppAdmin();
    }
    
    private void createDefaultAppAdmin() {
        try {
            // Check if APP_ADMIN already exists
            if (memberService.findByEmail(adminEmail).isPresent()) {
                logger.info("APP_ADMIN user already exists, skipping creation");
                return;
            }
            
            // Create default APP_ADMIN member
            Member adminMember = new Member();
            adminMember.setFirstName(adminFirstName);
            adminMember.setLastName(adminLastName);
            adminMember.setEmail(adminEmail);
            adminMember.setRole("APP_ADMIN");
            adminMember.setMemberType("admin");
            adminMember.setSchoolId(null); // APP_ADMIN has no school
            adminMember.setSchoolName("");
            
            // Hash the password using SHA-256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(adminPassword.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            adminMember.setPasswordHash(hexString.toString());
            
            Member createdAdmin = memberService.createMember(adminMember);
            
            logger.info("Default APP_ADMIN user created successfully in members collection:");
            logger.info("  - ID: {}", createdAdmin.getId());
            logger.info("  - Email: {}", createdAdmin.getEmail());
            logger.info("  - Full Name: {} {}", createdAdmin.getFirstName(), createdAdmin.getLastName());
            logger.info("  - Role: {}", createdAdmin.getRole());
            logger.info("  - Password: {} (Please change this in production!)", adminPassword);
            
        } catch (Exception e) {
            logger.error("Error creating default APP_ADMIN user: {}", e.getMessage(), e);
        }
    }
}