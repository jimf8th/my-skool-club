package com.myskoolclub.backend.security;

import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates requests with a Firebase ID token. Requests without a matching
 * enabled, email-verified local account continue unauthenticated; the session
 * endpoint is responsible for creating and linking local accounts.
 */
@Component
@RequiredArgsConstructor
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        try {
            FirebaseTokenVerifier.FirebaseIdentity identity =
                    firebaseTokenVerifier.verify(authHeader.substring(7));

            if (identity.emailVerified()
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                findLinkedUser(identity)
                        .filter(User::isEnabled)
                        .ifPresent(user -> {
                            var authToken = new UsernamePasswordAuthenticationToken(
                                    user.getEmail(), null,
                                    List.of(new SimpleGrantedAuthority(
                                            "ROLE_" + user.getAppRole().name())));
                            authToken.setDetails(
                                    new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        });
            }
        } catch (AppException ignored) {
            // Invalid or expired token — request continues unauthenticated.
        }

        chain.doFilter(request, response);
    }

    private Optional<User> findLinkedUser(FirebaseTokenVerifier.FirebaseIdentity identity) {
        Optional<User> byUid = userRepository.findByFirebaseUid(identity.uid());
        if (byUid.isPresent()) {
            return byUid;
        }
        // First Firebase sign-in of a pre-existing account: link by verified email.
        return userRepository.findByEmailIgnoreCase(identity.email())
                .filter(user -> user.getFirebaseUid() == null)
                .map(user -> {
                    user.setFirebaseUid(identity.uid());
                    user.setEmailVerified(true);
                    return userRepository.save(user);
                });
    }
}
