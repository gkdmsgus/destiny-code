package com.destinycode.saju;

import com.destinycode.ai.AnthropicService;
import com.destinycode.ai.ImageAsyncService;
import com.destinycode.common.exception.BusinessException;
import com.destinycode.saju.dto.SajuRequest;
import com.destinycode.saju.dto.SajuResponse;
import com.destinycode.user.User;
import com.destinycode.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SajuService {

    private final SajuRepository    sajuRepository;
    private final UserRepository    userRepository;
    private final AnthropicService  anthropicService;
    private final ImageAsyncService imageAsyncService; // ← 별도 빈으로 주입
    private final ObjectMapper      objectMapper = new ObjectMapper();

    // ─── 사주 저장 + Claude 분석 ──────────────────────────────────────────────

    @Transactional
    public SajuResponse saveSaju(String email, SajuRequest req) {
        User user = findUser(email);

        SajuInfo info = sajuRepository.findByUser(user)
                .orElse(SajuInfo.builder().user(user).build());

        // 기본 정보 세팅
        info.setName(req.getName());
        info.setGender(req.getGender());
        info.setCalendarType(req.getCalendarType());
        info.setBirthYear(req.getBirthYear());
        info.setBirthMonth(req.getBirthMonth());
        info.setBirthDay(req.getBirthDay());
        info.setBirthTime(req.getBirthTime());
        info.setBirthPlace(req.getBirthPlace());
        info.setImageReady(false);
        info.setImageData(null); // 새로 생성 시 초기화

        // 캐릭터 메타 계산 (일간 기반) — Claude 응답 전 fallback용
        CharacterMeta meta = buildMeta(req.getBirthYear(), req.getBirthMonth(), req.getBirthDay(), req.getGender());

        // 사주팔자 계산 (Claude 프롬프트용)
        Integer birthHour = null;
        if (req.getBirthTime() != null && !req.getBirthTime().isBlank()) {
            try { birthHour = Integer.parseInt(req.getBirthTime().split(":")[0]); } catch (Exception ignored) {}
        }
        String sajuPaljja = SajuCalculator.buildSajuText(
                req.getBirthYear(), req.getBirthMonth(), req.getBirthDay(), birthHour);

        // Claude API 호출 (최초 1회) → JSON 파싱 → DB 저장
        String rawJson = anthropicService.generateSajuAnalysis(
                req.getName(), req.getGender(),
                String.valueOf(req.getBirthYear()), String.valueOf(req.getBirthMonth()),
                String.valueOf(req.getBirthDay()), req.getBirthTime(), req.getBirthPlace(),
                meta.element(), meta.className(), sajuPaljja
        );

        // Claude JSON 파싱 — class/element/title/description 추출
        String description      = null;
        String characterElement = meta.element();    // fallback
        String characterClass   = meta.className();  // fallback
        String characterTitle   = meta.title();      // fallback

        if (rawJson != null) {
            try {
                JsonNode root = objectMapper.readTree(rawJson);
                description = root.path("description").asText(null);

                // Claude가 생성한 고유 class/element/title 우선 사용
                String claudeElement = root.path("characterElement").asText(null);
                String claudeClass   = root.path("characterClass").asText(null);
                String claudeTitle   = root.path("characterTitle").asText(null);
                if (claudeElement != null && !claudeElement.isBlank()) characterElement = claudeElement;
                if (claudeClass   != null && !claudeClass.isBlank())   characterClass   = claudeClass;
                if (claudeTitle   != null && !claudeTitle.isBlank())   characterTitle   = claudeTitle;

                info.setCharacterDetail(rawJson);
                log.info("Claude 생성 클래스: {} / 오행: {}", characterClass, characterElement);
            } catch (Exception e) {
                log.warn("Claude 응답 JSON 파싱 실패, 텍스트로 저장: {}", e.getMessage());
                description = rawJson;
            }
        }
        if (description == null || description.isBlank()) {
            description = meta.fallbackDescription(req.getBirthTime(), req.getBirthPlace());
        }

        info.setCharacterElement(characterElement);
        info.setCharacterClassName(characterClass);
        info.setCharacterTitle(characterTitle);
        info.setDescription(description);

        SajuInfo saved = sajuRepository.save(info);

        // 이미지 생성 — Claude가 생성한 class/element/title로 프롬프트 구성
        imageAsyncService.generateAndSave(
                saved.getId(), req.getName(), req.getGender(),
                characterElement, characterClass, characterTitle
        );

        return SajuResponse.from(saved, toSummary(characterElement, characterClass, characterTitle, description, saved));
    }

    // ─── 저장된 사주 조회 (Claude 재호출 없음) ────────────────────────────────

    @Transactional(readOnly = true)
    public SajuResponse getSaju(String email) {
        User user = findUser(email);
        SajuInfo info = sajuRepository.findByUser(user)
                .orElseThrow(() -> BusinessException.notFound("사주 정보가 없습니다."));

        return SajuResponse.fromSaved(info);
    }

    // ─── 오늘의 운세 ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getTodayFortune(String email) {
        User user = findUser(email);
        SajuInfo info = sajuRepository.findByUser(user)
                .orElseThrow(() -> BusinessException.notFound("사주 정보가 없습니다."));

        // 오늘 일진 계산
        java.time.LocalDate today = java.time.LocalDate.now();
        String todayJu = SajuCalculator.buildTodayJuText(today.getYear(), today.getMonthValue(), today.getDayOfMonth());

        String sajuPaljja = SajuCalculator.buildSajuText(
                info.getBirthYear(), info.getBirthMonth(), info.getBirthDay(), null);

        String rawJson = anthropicService.generateDailyFortune(
                info.getName(),
                info.getCharacterClassName(),
                info.getCharacterElement(),
                sajuPaljja,
                todayJu
        );

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("date", today.toString());
        if (rawJson != null) {
            try {
                com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(rawJson);
                result.put("fortune",  node.path("fortune").asText("오늘의 운세를 불러올 수 없습니다."));
                result.put("keyword",  node.path("keyword").asText(""));
                result.put("luck",     node.path("luck").asInt(3));
            } catch (Exception e) {
                result.put("fortune", rawJson);
                result.put("keyword", "");
                result.put("luck", 3);
            }
        } else {
            result.put("fortune", "오늘의 운세를 불러올 수 없습니다. API 키를 확인해주세요.");
            result.put("keyword", "");
            result.put("luck", 3);
        }
        return result;
    }

    // ─── 이미지 상태만 확인 (Claude 재호출 없음) ──────────────────────────────

    @Transactional(readOnly = true)
    public SajuResponse getImageStatus(String email) {
        User user = findUser(email);
        SajuInfo info = sajuRepository.findByUser(user)
                .orElseThrow(() -> BusinessException.notFound("사주 정보가 없습니다."));
        return SajuResponse.fromSaved(info);
    }

    // ─── 내부 헬퍼 ───────────────────────────────────────────────────────────

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> BusinessException.notFound("사용자를 찾을 수 없습니다."));
    }

    private SajuResponse.CharacterSummary toSummary(String element, String className, String title,
                                                     String description, SajuInfo saved) {
        return SajuResponse.CharacterSummary.builder()
                .element(element)
                .className(className)
                .title(title)
                .description(description)
                .characterDetail(saved.getCharacterDetail())
                .build();
    }

    /**
     * 사주팔자 기반 캐릭터 메타 계산
     * - 일간(日干): 이 사람의 핵심 오행 (가장 중요)
     * - 년간(年干): 보조 오행 (기존 방식)
     * - 두 오행을 조합해 12가지 고유 클래스 결정
     */
    CharacterMeta buildMeta(int birthYear, int birthMonth, int birthDay, String gender) {
        boolean male = "MALE".equals(gender);

        // 일간 오행 (핵심)
        int dayStem  = SajuCalculator.dayStemIdx(birthYear, birthMonth, birthDay);
        // 0,1=목  2,3=화  4,5=토  6,7=금  8,9=수

        // 년간 오행 (보조, 클래스 변형에 사용)
        int yearStem = SajuCalculator.yearStemIdx(birthYear);
        boolean yangDay = (dayStem % 2 == 0); // 양간(甲丙戊庚壬) vs 음간(乙丁己辛癸)

        return switch (dayStem / 2) {  // 0=목, 1=화, 2=토, 3=금, 4=수
            case 0 -> new CharacterMeta(   // 木 일간
                    "목 (Wood)",
                    male
                        ? (yangDay ? "청운의 옥피리 도사" : "신목의 바람 신장(神將)")
                        : (yangDay ? "버드나무 백호선녀" : "새벽 숲의 산신녀(山神女)"),
                    yangDay ? "동방의 생명력을 개척하는 수려한 선인" : "숲의 기운을 다스리는 신비로운 존재",
                    "푸르른 목(木)의 청명한 생명력으로 신령의 부채와 피리 소리로 영혼을 치유합니다."
            );
            case 1 -> new CharacterMeta(   // 火 일간
                    "화 (Fire)",
                    male
                        ? (yangDay ? "벼락 불꽃의 천우신장(神將)" : "붉은 달의 화신(火神)")
                        : (yangDay ? "붉은 봉황의 지옥 화무(巫堂)" : "촛불의 영매 선녀"),
                    yangDay ? "신당의 불꽃을 각성한 화려한 리드 보컬" : "은은한 불빛으로 운명을 비추는 신비로운 존재",
                    "뜨겁고 찬란한 화(火)의 불꽃으로 오색 깃발과 불타는 방울을 흔들어 악귀를 퇴마합니다."
            );
            case 2 -> new CharacterMeta(   // 土 일간
                    "토 (Earth)",
                    male
                        ? (yangDay ? "바위 성벽의 태수장군(大將軍)" : "황토 대지의 수호신장")
                        : (yangDay ? "지리산 산신녀(山神女)" : "황금 들판의 곡신녀(穀神女)"),
                    yangDay ? "대지의 무게를 견디는 든든한 리더" : "대지의 품으로 만물을 어루만지는 존재",
                    "묵직하고 강건한 토(土)의 기운으로 지리산 영산의 정기를 담아 강건한 가호의 장벽을 칩니다."
            );
            case 3 -> new CharacterMeta(   // 金 일간
                    "금 (Metal)",
                    male
                        ? (yangDay ? "명부의 저승사자(使者)" : "백금 칼날의 심판관")
                        : (yangDay ? "성스러운 삼신선녀(三神仙女)" : "은빛 달의 결계 무녀"),
                    yangDay ? "명부의 룰을 다스리는 초절정 비주얼" : "날카로운 직관으로 진실을 꿰뚫는 존재",
                    "탄생일의 예리한 금(金)의 기운을 얻어 날카로운 철검과 부적으로 사악한 영을 정화합니다."
            );
            default -> new CharacterMeta(  // 水 일간
                    "수 (Water)",
                    male
                        ? (yangDay ? "대나무숲 청룡도사" : "심연 용왕의 신관(神官)")
                        : (yangDay ? "심연의 용신무녀(龍神巫女)" : "달빛 파도의 해신녀(海神女)"),
                    yangDay ? "신령스러운 해류를 지배하는 카리스마" : "깊은 고요 속에 모든 것을 담아내는 존재",
                    "깊고 고요한 수(水)의 영성으로 용신의 방울을 흔들며 비를 부르고 어둠을 차단합니다."
            );
        };
    }

    record CharacterMeta(String element, String className, String title, String baseDesc) {
        String fallbackDescription(String birthTime, String birthPlace) {
            String timeNote = birthTime != null
                    ? " 태어난 시각 " + birthTime + "의 천간 기운이 능력에 스며들었습니다."
                    : " 태어난 시간이 신비로운 안개에 싸여 변칙 영력을 지니게 되었습니다.";
            return baseDesc + timeNote + " " + birthPlace + "의 영산 기운이 모태에 스며들어 직업 시너지가 활성화되었습니다.";
        }
    }
}
