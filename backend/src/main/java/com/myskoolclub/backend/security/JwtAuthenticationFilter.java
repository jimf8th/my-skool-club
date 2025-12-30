package com.myskoolclub.backend.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, 
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        // Only process JWT for API endpoints
        String requestPath = request.getRequestURI();
        if (!requestPath.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        final String requestTokenHeader = request.getHeader("Authorization");

        String username = null;
        String jwtToken = null;

        // JWT Token is in the form "Bearer token". Remove Bearer word and get only the Token
        if (requestTokenHeader != null && requestTokenHeader.startsWith("Bearer ")) {
            jwtToken = requestTokenHeader.substring(7);
            try {
                username = jwtTokenUtil.getUsernameFromToken(jwtToken);
                logger.debug("JWT Token found for user: " + username);
            } catch (IllegalArgumentException e) {
                logger.error("Unable to get JWT Token: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            } catch (ExpiredJwtException e) {
                logger.error("JWT Token has expired for user: " + e.getClaims().getSubject() + ". Token expired at: " + e.getClaims().getExpiration());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            } catch (MalformedJwtException e) {
                logger.error("JWT Token is malformed: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            } catch (Exception e) {
                logger.error("Error parsing JWT Token: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            }
        } else {
            logger.debug("No JWT Token found in request headers");
        }

        // Once we get the token validate it.
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            // Validate token
            if (jwtTokenUtil.validateToken(jwtToken)) {
                logger.info("JWT Token is valid for user: " + username);
                
                // Create a simple authentication token with just the username
                // We'll load the full member information in the controllers as needed
                UsernamePasswordAuthenticationToken authToken = 
                        new UsernamePasswordAuthenticationToken(username, null, new ArrayList<>());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                // Set the authentication in the context
                SecurityContextHolder.getContext().setAuthentication(authToken);
                logger.info("Authentication set in security context for user: " + username);
            } else {
                logger.error("JWT Token validation failed for user: " + username + ". Token may be expired or invalid.");
            }
        }
        chain.doFilter(request, response);
    }
}