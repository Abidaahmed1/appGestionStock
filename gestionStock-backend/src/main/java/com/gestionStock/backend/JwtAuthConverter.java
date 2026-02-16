package com.gestionStock.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

	private final JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

	@Value("${jwt.auth.converter.principal-attribute:preferred_username}")
	private String principalAttribute;

	@Value("${jwt.auth.converter.resource-id:myclient}")
	private String resourceId;

	@Override
	public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
		Collection<GrantedAuthority> authorities = Stream
				.concat(jwtGrantedAuthoritiesConverter.convert(jwt).stream(),
						Stream.concat(extractResourceRoles(jwt).stream(), extractRealmRoles(jwt).stream()))
				.collect(Collectors.toSet());

		return new JwtAuthenticationToken(jwt, authorities, getPrincipleClaimName(jwt));
	}

	private String getPrincipleClaimName(Jwt jwt) {
		return jwt.getClaim(principalAttribute) != null ? jwt.getClaim(principalAttribute)
				: jwt.getClaim(JwtClaimNames.SUB);
	}

	private Collection<? extends GrantedAuthority> extractResourceRoles(Jwt jwt) {
		Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
		if (resourceAccess == null || !resourceAccess.containsKey(resourceId)) {
			return Set.of();
		}

		@SuppressWarnings("unchecked")
		Map<String, Object> resource = (Map<String, Object>) resourceAccess.get(resourceId);
		@SuppressWarnings("unchecked")
		Collection<String> resourceRoles = (Collection<String>) resource.get("roles");

		if (resourceRoles == null) {
			return Set.of();
		}

		return resourceRoles.stream()
				.map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase().replace(" ", "_")))
				.collect(Collectors.toSet());
	}

	private Collection<? extends GrantedAuthority> extractRealmRoles(Jwt jwt) {
		Map<String, Object> realmAccess = jwt.getClaim("realm_access");
		if (realmAccess == null || !realmAccess.containsKey("roles")) {
			return Set.of();
		}

		@SuppressWarnings("unchecked")
		Collection<String> realmRoles = (Collection<String>) realmAccess.get("roles");
		if (realmRoles == null) {
			return Set.of();
		}

		return realmRoles.stream()
				.map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase().replace(" ", "_")))
				.collect(Collectors.toSet());
	}
}
