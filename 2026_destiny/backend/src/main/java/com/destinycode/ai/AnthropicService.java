package com.destinycode.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AnthropicService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String MODEL = "claude-opus-4-5";

    private final String apiKey;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AnthropicService(@Value("${ai.anthropic.api-key}") String apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * 사주 정보를 받아 RPG 캐릭터 설명 텍스트를 생성합니다.
     */
    public String generateSajuAnalysis(String name, String gender, String birthYear,
                                       String birthMonth, String birthDay, String birthTime,
                                       String birthPlace, String element, String className,
                                       String sajuPaljja) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY가 설정되지 않아 기본 설명을 사용합니다.");
            return null;
        }

        String genderKr = gender.equals("MALE") ? "남성" : "여성";
        String timeText = birthTime != null ? birthTime + "시" : "시간 미상";

        String prompt = String.format("""
                아래 사주 정보를 바탕으로 한국 전통 무속 세계관 + RPG 게임 언어를 결합한 "신(神) 캐릭터 카드"를 JSON으로 작성해주세요.
                반드시 JSON만 반환하세요. 마크다운 코드블록(```)도 사용하지 말고, 설명도 붙이지 마세요. 오직 { } JSON만 반환합니다.

                [사주 정보]
                - 이름: %s
                - 성별: %s
                - 생년월일: %s년 %s월 %s일
                - 태어난 시간: %s
                - 태어난 장소: %s
                - 핵심 오행 속성 (일간 기반): %s
                - 직업 클래스: %s

                [사주팔자(四柱八字) — 이 데이터를 깊이 분석하여 캐릭터에 반영할 것]
%s
                - 일간(日干)이 이 사람의 본질을 나타냄. 오행 분포를 보고 부족하거나 넘치는 기운을 캐릭터 특성에 반영할 것.
                - 음양(陰陽): 일간이 양간(甲丙戊庚壬)이면 외향적·능동적, 음간(乙丁己辛癸)이면 내향적·수용적 성향 참고.

                [반환 형식 - 이 JSON 구조 그대로 반환]
                {
                  "description": "200자 내외 캐릭터 한줄 소개. 사주 기운을 게임 스탯 언어로 표현. K-POP 아이돌처럼 매력적으로.",
                  "personality": [
                    "성격 특성 1 (간결하게 한 문장)",
                    "성격 특성 2",
                    "성격 특성 3",
                    "성격 특성 4",
                    "성격 특성 5"
                  ],
                  "divineStatus": "이 사람이 신이라면 어떤 신인지 설명. 신화적/무속적 세계관. 2~3문장. 어떤 존재를 주관하는 신인지, 어떤 방식으로 인간과 관계 맺는지 포함.",
                  "abilities": [
                    {"name": "능력명 (한자 포함 가능)", "desc": "능력 설명 1~2문장"},
                    {"name": "능력명", "desc": "능력 설명"},
                    {"name": "능력명", "desc": "능력 설명"},
                    {"name": "능력명", "desc": "능력 설명"}
                  ],
                  "symbols": "이 신의 상징물 3~4가지를 · 으로 구분하여 나열",
                  "backstory": "이 신이 인간이었을 때의 이야기와 신이 된 과정. 2문단. 감정적으로 풍부하게.",
                  "likes": "이 신이 좋아하는 것 3가지를 · 으로 구분",
                  "dislikes": "이 신이 싫어하는 것 3가지를 · 으로 구분",
                  "quotes": [
                    "신의 명언 1 (짧고 인상적으로)",
                    "신의 명언 2",
                    "신의 명언 3"
                  ],
                  "characterElement": "이 사람의 핵심 오행. 예: '목 (Wood)' / '화 (Fire)' / '토 (Earth)' / '금 (Metal)' / '수 (Water)'",
                  "characterClass": "이 사람만의 고유한 클래스/직업명. 한국 무속+RPG 스타일. 이 사람의 사주팔자에서 나온 독창적인 이름. 예: '금사신(金蛇神)의 저승 판관', '청목(靑木) 바람의 경계 도사' 등. 절대로 다른 사람과 겹치지 않게.",
                  "characterTitle": "이 사람만의 고유한 한 줄 칭호. 이 사람의 팔자가 가진 특별한 기운을 함축. 예: '봄비처럼 스며드는 운명의 설계자'",
                  "stats": [
                    {"label": "체력", "color": "#a3e635", "value": 0},
                    {"label": "공격력", "color": "#ff4d4d", "value": 0},
                    {"label": "마력", "color": "#00d2fc", "value": 0},
                    {"label": "민첩", "color": "#f59e0b", "value": 0},
                    {"label": "카리스마", "color": "#c084fc", "value": 0}
                  ]
                }
                stats value는 0~100 사이 정수. 사주팔자 오행 분포를 반영해서 개인마다 다르게 부여. color는 그대로 유지.
                characterClass는 이 사람의 사주팔자(특히 일간과 오행 분포, 격국)를 깊이 분석해서 세상에 하나뿐인 이름을 만들어야 함.
                """, name, genderKr, birthYear, birthMonth, birthDay, timeText, birthPlace, element, className, sajuPaljja);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", ANTHROPIC_VERSION);

            Map<String, Object> body = Map.of(
                    "model", MODEL,
                    "max_tokens", 2048,
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    )
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String text = root.path("content").get(0).path("text").asText();
                return extractJson(text);
            }
        } catch (Exception e) {
            log.error("Anthropic API 호출 오류: {}", e.getMessage(), e);
        }

        return null;
    }

    /**
     * 오늘의 운세 한 줄 생성
     */
    public String generateDailyFortune(String name, String characterClass, String characterElement,
                                        String sajuPaljja, String todayJu) {
        if (apiKey == null || apiKey.isBlank()) return null;

        String prompt = String.format("""
                아래 사주 정보를 바탕으로 오늘의 운세를 게임 신탁 스타일로 작성해주세요.
                반드시 JSON만 반환하세요. 설명 없이 { } JSON만.

                [이 사람 정보]
                - 이름: %s
                - 클래스: %s
                - 핵심 오행: %s
                - 사주팔자:
                %s

                [오늘 일진]
                %s

                [반환 형식]
                {
                  "fortune": "오늘의 운세 2~3문장. 게임의 신탁처럼 신비롭고 시적으로. 구체적인 행동 조언 1가지 포함.",
                  "keyword": "오늘을 한 단어로 표현 (예: 각성, 시련, 도약, 침묵, 전환점)",
                  "luck": 1~5 (오늘 운세 점수, 정수)
                }
                """, name, characterClass, characterElement, sajuPaljja, todayJu);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", ANTHROPIC_VERSION);

            Map<String, Object> body = Map.of(
                    "model", MODEL,
                    "max_tokens", 512,
                    "messages", List.of(Map.of("role", "user", "content", prompt))
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String text = root.path("content").get(0).path("text").asText();
                return extractJson(text);
            }
        } catch (Exception e) {
            log.error("운세 생성 오류: {}", e.getMessage(), e);
        }
        return null;
    }

    /** 응답 텍스트에서 JSON 부분만 추출 (마크다운 코드블록 제거 등) */
    private String extractJson(String text) {
        if (text == null) return null;
        // ```json ... ``` 제거
        int codeStart = text.indexOf("```json");
        if (codeStart != -1) {
            int newline = text.indexOf('\n', codeStart);
            if (newline != -1) {
                int codeEnd = text.indexOf("```", newline);
                if (codeEnd != -1) return text.substring(newline + 1, codeEnd).trim();
            }
        }
        // ``` ... ``` 제거
        codeStart = text.indexOf("```");
        if (codeStart != -1) {
            int newline = text.indexOf('\n', codeStart);
            if (newline != -1) {
                int codeEnd = text.indexOf("```", newline);
                if (codeEnd != -1) return text.substring(newline + 1, codeEnd).trim();
            }
        }
        // { ... } 추출
        int braceStart = text.indexOf('{');
        int braceEnd   = text.lastIndexOf('}');
        if (braceStart != -1 && braceEnd > braceStart) {
            return text.substring(braceStart, braceEnd + 1).trim();
        }
        return text.trim();
    }
}
