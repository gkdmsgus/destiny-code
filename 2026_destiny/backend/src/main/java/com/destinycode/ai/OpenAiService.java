package com.destinycode.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
public class OpenAiService {

    private static final String API_URL = "https://api.openai.com/v1/images/generations";

    private final String apiKey;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAiService(@Value("${ai.openai.api-key}") String apiKey) {
        this.apiKey = apiKey;
    }

    public String generateCharacterImage(String name, String gender, String element,
                                         String className, String title) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OPENAI_API_KEY가 설정되지 않아 이미지 생성을 건너뜁니다.");
            return null;
        }

        String prompt = buildPrompt(name, gender, element, className, title);
        log.info("gpt-image-1 이미지 생성 요청 - {}", className);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = Map.of(
                    "model", "gpt-image-1",
                    "prompt", prompt,
                    "n", 1,
                    "size", "1024x1536"   // 9:16 portrait
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode dataNode = root.path("data").get(0);

                String b64 = dataNode.path("b64_json").asText(null);
                if (b64 != null && !b64.isBlank()) {
                    log.info("gpt-image-1 이미지 생성 성공 (b64)");
                    return "data:image/png;base64," + b64;
                }

                String imageUrl = dataNode.path("url").asText(null);
                if (imageUrl != null && !imageUrl.isBlank()) {
                    log.info("gpt-image-1 이미지 생성 성공 (url)");
                    byte[] imageBytes = restTemplate.getForObject(imageUrl, byte[].class);
                    if (imageBytes != null) {
                        return "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
                    }
                }
            }
        } catch (Exception e) {
            log.error("gpt-image-1 이미지 생성 오류: {}", e.getMessage(), e);
        }

        return null;
    }

    private String buildPrompt(String name, String gender, String element,
                                String className, String title) {
        String genderKr  = gender.equals("MALE") ? "남성" : "여성";
        String godAura   = resolveGodAura(element);
        String godSymbol = resolveGodSymbol(element);
        String godStyle  = resolveGodStyle(className);

        return String.format(
            "masterpiece, ultra detailed, 8K. " +
            "Emotionally layered watercolor illustration. " +
            "Transparent watercolor wash, ink stains, hand-drawn texture, " +
            "crisp and delicate brushwork, high clarity sketching. " +
            "Full body composition, cinematic light and shadow, " +
            "powerful atmosphere, intricate costume details, expressive face, dynamic pose. " +
            "Museum-grade illustration aesthetic, soft luxury, high-end fashion magazine feel. " +
            "Poetic visual atmosphere, emotionally powerful visual storytelling. " +

            "Subject: A %s divine being named '%s', the '%s'. " +
            "Element and aura: %s. " +
            "Divine symbols: %s. " +
            "Costume and presence: %s. " +

            "Concept: If this person were a god — not a benevolent savior, but an enigmatic deity " +
            "whose love and salvation are incomprehensible to ordinary humans. " +
            "People may fear, worship, or be obsessed with this god. " +
            "Their divine nature pushes the extremes of their personality. " +
            "The expression, gaze, light and shadow must naturally reflect this divine identity. " +

            "Korean text overlay (clear and readable, elegant placement): " +
            "Title at top '내가 신이라면?', character name '%s', divine class '%s', element '%s'. " +

            "Forbidden: Japanese text, blurry text, simplified Chinese, typos, " +
            "3DCG feel, excessive AI-beauty look, excessive photorealism. " +
            "All text must be Korean (한글) and clearly legible. " +
            "Portrait orientation 9:16.",
            genderKr, name, title,
            godAura, godSymbol, godStyle,
            name, className, element
        );
    }

    private String resolveGodAura(String element) {
        if (element.contains("화") || element.contains("Fire"))
            return "blazing crimson and gold flames, smoldering heat distortion, ember sparks";
        if (element.contains("수") || element.contains("Water"))
            return "deep indigo and silver water currents, misty ocean aura, dragon scales shimmer";
        if (element.contains("목") || element.contains("Wood"))
            return "luminous jade green light, ancient forest energy, blooming petals around";
        if (element.contains("금") || element.contains("Metal"))
            return "cold platinum and steel-blue radiance, sharp geometric light shards";
        return "deep amber earth tones, ancient mountain energy, grounding stone aura";
    }

    private String resolveGodSymbol(String element) {
        if (element.contains("화") || element.contains("Fire"))
            return "flame-tipped divine spear, burning sacred talisman, phoenix feather";
        if (element.contains("수") || element.contains("Water"))
            return "dragon orb, sacred water vessel, shimmering tidal staff";
        if (element.contains("목") || element.contains("Wood"))
            return "ancient jade flute, sacred bloom branch, divine wind fan";
        if (element.contains("금") || element.contains("Metal"))
            return "divine iron sword, sealed spirit mirror, celestial bell";
        return "sacred mountain stone seal, ancient earth rune tablet, divine cauldron";
    }

    private String resolveGodStyle(String className) {
        if (className.contains("저승") || className.contains("사자") || className.contains("판관") || className.contains("심판"))
            return "sleek black divine Hanbok with silver death-realm embroidery, Gat hat with glowing rim, cold ethereal presence";
        if (className.contains("선녀") || className.contains("천녀") || className.contains("해신") || className.contains("달"))
            return "flowing translucent silver divine Hanbok with ribbon trails, otherworldly celestial grace";
        if (className.contains("도사") || className.contains("선인") || className.contains("신관") || className.contains("경계"))
            return "deep teal divine robe with jade and cloud motifs, long flowing sleeves, ancient scholar deity";
        if (className.contains("무당") || className.contains("화무") || className.contains("영매") || className.contains("무녀"))
            return "dramatic red and white divine ceremonial Hanbok, elaborate headpiece, intense shamanic energy";
        if (className.contains("신장") || className.contains("장군") || className.contains("신병") || className.contains("수호"))
            return "divine armored Hanbok fusion, gold war deity ornaments, commanding battlefield presence";
        if (className.contains("산신") || className.contains("대지") || className.contains("토신") || className.contains("곡신"))
            return "earth-tone divine Hanbok with mountain and stone motifs, grounded powerful presence";
        if (className.contains("용") || className.contains("수신") || className.contains("청룡") || className.contains("해룡"))
            return "deep blue-black divine Hanbok with dragon scale patterns, shimmering water energy";
        // Claude가 완전히 새로운 클래스명을 만든 경우: 클래스명 자체를 스타일 힌트로 활용
        return "uniquely styled divine Korean deity costume matching the class '" + className + "', ethereal otherworldly presence, divine Hanbok-inspired outfit";
    }
}
