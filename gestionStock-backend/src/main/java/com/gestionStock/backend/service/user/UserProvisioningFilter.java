package com.gestionStock.backend.service.user;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.gestionStock.backend.entity.user.Role;
import org.springframework.web.filter.OncePerRequestFilter;
import java.util.Map;
import java.util.List;

@Component
public class UserProvisioningFilter extends OncePerRequestFilter {
	private final UserService userService;

	public UserProvisioningFilter(UserService userService) {
		this.userService = userService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
			String id = jwt.getSubject();
			String firstName = jwt.getClaimAsString("given_name") != null ? jwt.getClaimAsString("given_name") : "";
			String lastName = jwt.getClaimAsString("family_name") != null ? jwt.getClaimAsString("family_name") : "";
			String email = jwt.getClaimAsString("email");

			Role userRole = Role.MAGASINIER;
			Map<String, Object> realmAccess = jwt.getClaim("realm_access");
			if (realmAccess != null && realmAccess.containsKey("roles")) {
				@SuppressWarnings("unchecked")
				List<String> roles = (List<String>) realmAccess.get("roles");
				for (String r : roles) {
					try {
						userRole = Role.valueOf(r.toUpperCase().replace(" ", "_"));
						break;
					} catch (Exception e) {
					}
				}
			}

			userService.provisionUserIfNeeded(id, firstName, lastName, email, userRole);
		}
		filterChain.doFilter(request, response);
	}
}
