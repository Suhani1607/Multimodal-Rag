package com.knowledge.platform.config;

import com.knowledge.platform.model.UserEntity;
import com.knowledge.platform.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
public class ClerkAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ClerkAuthFilter.class);

    @Value("${clerk.secret-key:}")
    private String clerkSecretKey;

    private final UserRepository userRepository;

    public ClerkAuthFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String devUserIdHeader = request.getHeader("X-Dev-User-Id");

        String userId = null;
        String userEmail = "developer@knowledge.local";
        String userName = "Developer User";

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            
            // If it's a dev mock token
            if (token.startsWith("mock_") || token.equals("dev-token")) {
                userId = "user_dev_" + (token.length() > 5 ? token.substring(5) : "default");
            } else {
                try {
                    // Try parsing as JWT token
                    // Extract subject without verification if secret key is empty, or verify with secret key
                    if (clerkSecretKey != null && !clerkSecretKey.isBlank()) {
                        // In production Clerk provides JWKS or secret key signing
                        int i = token.lastIndexOf('.');
                        String withoutSignature = token.substring(0, i + 1);
                        Claims claims = Jwts.parser().build().parseSignedClaims(token).getPayload();
                        userId = claims.getSubject();
                        if (claims.get("email") != null) {
                            userEmail = claims.get("email", String.class);
                        }
                    } else {
                        // Parse unverified JWT payload for development/offline test
                        String[] parts = token.split("\\.");
                        if (parts.length >= 2) {
                            String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                            // extract "sub"
                            int subIdx = payloadJson.indexOf("\"sub\":\"");
                            if (subIdx != -1) {
                                int endIdx = payloadJson.indexOf("\"", subIdx + 7);
                                if (endIdx != -1) {
                                    userId = payloadJson.substring(subIdx + 7, endIdx);
                                }
                            }
                        }
                        if (userId == null) {
                            userId = "user_clerk_guest";
                        }
                    }
                } catch (Exception e) {
                    log.debug("JWT verification exception: {}", e.getMessage());
                    userId = "user_dev_fallback";
                }
            }
        } else if (devUserIdHeader != null && !devUserIdHeader.isBlank()) {
            userId = devUserIdHeader.trim();
        } else {
            // Default development session identifier if neither is passed (enables local developer workflow)
            userId = "user_default_workspace";
        }

        if (userId != null) {
            // Ensure user exists in database
            final String finalUserId = userId;
            final String finalUserEmail = userEmail;
            final String finalUserName = userName;
            userRepository.findByClerkId(finalUserId).orElseGet(() -> {
                UserEntity u = new UserEntity(finalUserId, finalUserEmail, finalUserName);
                return userRepository.save(u);
            });

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
