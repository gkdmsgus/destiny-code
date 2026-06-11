package com.destinycode.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // IP별 버킷 (로그인/회원가입 브루트포스 방어)
    private final Map<String, Bucket> ipBuckets   = new ConcurrentHashMap<>();
    // 사용자별 버킷 (AI API 비용 절감)
    private final Map<String, Bucket> userBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // 로그인 · 회원가입 → IP당 분당 10회
        if (path.equals("/api/auth/login") || path.equals("/api/auth/signup")) {
            String ip = getClientIp(request);
            Bucket bucket = ipBuckets.computeIfAbsent(ip, k -> newBucket(10, Duration.ofMinutes(1)));
            if (!bucket.tryConsume(1)) {
                reject(response, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요. (분당 10회 제한)");
                return;
            }
        }

        // 사주 생성 API → 사용자당 분당 5회 (AI API 비용 절감)
        if (path.startsWith("/api/saju") && "POST".equalsIgnoreCase(request.getMethod())) {
            String userKey = resolveUserKey(request);
            Bucket bucket = userBuckets.computeIfAbsent(userKey, k -> newBucket(5, Duration.ofMinutes(1)));
            if (!bucket.tryConsume(1)) {
                reject(response, "사주 생성은 분당 5회까지 가능합니다. 잠시 후 다시 시도해주세요.");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private Bucket newBucket(int capacity, Duration refillDuration) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, refillDuration)
                        .build())
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private String resolveUserKey(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            // 토큰 앞 20자로 키 생성 (실제 이메일은 JwtUtil 없이 접근 불가)
            return "user:" + auth.substring(7, Math.min(27, auth.length()));
        }
        return "ip:" + getClientIp(request);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"error\":\"" + message + "\"}"
        );
    }
}
