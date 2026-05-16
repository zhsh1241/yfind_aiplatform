package com.yf.smp.app.platform;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class PlatformSessionAuthenticationFilter extends OncePerRequestFilter {
    private final PlatformIdentityService platformIdentityService;

    public PlatformSessionAuthenticationFilter(PlatformIdentityService platformIdentityService) {
        this.platformIdentityService = platformIdentityService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && !authorization.isBlank()) {
            try {
                PlatformPrincipal principal = platformIdentityService.requirePrincipal(authorization);
                PlatformAuthentication authentication = new PlatformAuthentication(principal);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (PlatformException exception) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private static final class PlatformAuthentication extends AbstractAuthenticationToken {
        private final PlatformPrincipal principal;

        private PlatformAuthentication(PlatformPrincipal principal) {
            super(principal.permissions().stream().map(SimpleGrantedAuthority::new).toList());
            this.principal = principal;
            setAuthenticated(true);
        }

        @Override
        public Object getCredentials() {
            return principal.session().accessToken();
        }

        @Override
        public Object getPrincipal() {
            return principal;
        }
    }
}
