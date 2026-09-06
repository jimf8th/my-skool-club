package com.myskoolclub.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.SchoolOnboardingRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:support@myskoolclub.com}")
    private String fromAddress;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.mobile-scheme:myskoolclub}")
    private String mobileScheme;

    public void sendFriendInvitationEmail(
            String toEmail, String firstName, String inviterName, String token) {
        String invitationUrl = frontendUrl.replaceAll("/+$", "")
                + "/accept-invite#token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        String mobileUrl = mobileScheme + "://accept-invite?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject(inviterName + " invited you to My Skool Club");
        message.setText(
                "Hi " + firstName + ",\n\n" +
                inviterName + " invited you to join My Skool Club.\n\n" +
                "Open this secure link to set up your account:\n" +
                invitationUrl + "\n\n" +
                "If My Skool Club is installed, you can open it directly:\n" +
                mobileUrl + "\n\n" +
                "The link expires in 48 hours. You will sign in with your email address " +
                "or Google/Apple account to accept the invitation.\n\n" +
                "If you were not expecting this invitation, you can safely ignore it.\n\n" +
                "My Skool Club"
        );
        send(message, "friend invitation", toEmail);
    }

    public void sendSchoolRequestSubmitted(SchoolOnboardingRequest request) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo("support@myskoolclub.com");
        message.setSubject("School activation request #" + request.getId() + ": " + request.getSchoolName());
        message.setText(
                "A public school activation request was submitted.\n\n" +
                "Request: #" + request.getId() + "\n" +
                "Administrator: " + request.getFirstName() + " " + request.getLastName() + "\n" +
                "Administrator email: " + request.getAdminEmail() + "\n" +
                "Contact phone: " + request.getContactPhone() + "\n\n" +
                "School: " + request.getSchoolName() + "\n" +
                "Description: " + request.getDescription() + "\n" +
                "Address: " + request.getAddress() + ", " + request.getCity() + ", " +
                request.getState() + " " + request.getPostalCode() + "\n" +
                "Website: " + request.getWebsite() + "\n" +
                "School phone: " + request.getSchoolPhone() + "\n\n" +
                "Review it at " + frontendUrl.replaceAll("/+$", "") + "/school-requests."
        );
        send(message, "school request", "support@myskoolclub.com");
    }

    public void sendSchoolRequestApproved(SchoolOnboardingRequest request, School school) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(request.getAdminEmail());
        message.setSubject(request.getSchoolName() + " was approved on My Skool Club");
        message.setText(
                "Hi " + request.getFirstName() + ",\n\n" +
                "Your request for " + request.getSchoolName() + " was approved. The school is now active.\n\n" +
                "Sign in at " + frontendUrl + " to manage the school as its administrator.\n\n" +
                "My Skool Club"
        );
        send(message, "school request approval", request.getAdminEmail());
    }

    public void sendSchoolRequestRejected(SchoolOnboardingRequest request) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(request.getAdminEmail());
        message.setSubject("Update on your My Skool Club school request");
        message.setText(
                "Hi " + request.getFirstName() + ",\n\n" +
                "Your request for " + request.getSchoolName() + " was not approved.\n\n" +
                "Reason: " + request.getRejectionReason() + "\n\n" +
                "You may contact support@myskoolclub.com if you need help.\n\n" +
                "My Skool Club"
        );
        send(message, "school request rejection", request.getAdminEmail());
    }

    public void sendSchoolAdminInvitationEmail(
            String toEmail, String firstName, String schoolName, String token) {
        String invitationUrl = frontendUrl.replaceAll("/+$", "")
                + "/accept-invite#token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
        String mobileUrl = mobileScheme + "://accept-invite?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject(schoolName + " was approved on My Skool Club");
        message.setText(
                "Hi " + firstName + ",\n\n" +
                "Your request for " + schoolName + " was approved. The school is now active.\n\n" +
                "Create your secure account with this link to become the school administrator:\n" +
                invitationUrl + "\n\n" +
                "Open in the mobile app:\n" + mobileUrl + "\n\n" +
                "The invitation expires in 48 hours.\n\nMy Skool Club"
        );
        send(message, "school administrator invitation", toEmail);
    }

    private void send(SimpleMailMessage message, String description, String toEmail) {
        try {
            mailSender.send(message);
            log.info("{} email sent to {}", description, toEmail);
        } catch (Exception e) {
            log.error("Failed to send {} email to {}: {}", description, toEmail, e.getMessage());
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE,
                    "We could not send the email. Please try again.");
        }
    }

    /** Best-effort operational alert; report submission must still succeed if SMTP is unavailable. */
    public void sendModerationAlert(Long reportId, String contentType, String reason) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo("support@myskoolclub.com");
        message.setSubject("My Skool Club content report #" + reportId);
        message.setText(
                "A user submitted a content report.\n\n" +
                "Report: #" + reportId + "\n" +
                "Content type: " + contentType + "\n" +
                "Reason: " + reason + "\n\n" +
                "Review it at " + frontendUrl + "/moderation.\n\n" +
                "The reported content is intentionally omitted from email."
        );
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Could not send moderation alert for report {}: {}", reportId, e.getMessage());
        }
    }
}
