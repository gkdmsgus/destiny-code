package com.destinycode.saju;

/**
 * 사주팔자(四柱八字) 기본 계산기
 * - 년주/월주/일주/시주 천간·지지 계산
 * - 오행 분포 집계
 * - 일간(日干) 기반 핵심 오행 결정
 */
public class SajuCalculator {

    // ── 천간 (10 Heavenly Stems) ──────────────────────────────────────────────
    public static final String[] STEMS = {
        "갑(甲)", "을(乙)", "병(丙)", "정(丁)", "무(戊)",
        "기(己)", "경(庚)", "신(辛)", "임(壬)", "계(癸)"
    };

    // ── 지지 (12 Earthly Branches) ───────────────────────────────────────────
    public static final String[] BRANCHES = {
        "자(子)", "축(丑)", "인(寅)", "묘(卯)", "진(辰)", "사(巳)",
        "오(午)", "미(未)", "신(申)", "유(酉)", "술(戌)", "해(亥)"
    };

    // ── 천간 오행 (목목화화토토금금수수) ─────────────────────────────────────
    public static final String[] STEM_OHAENG = {
        "목(木)", "목(木)", "화(火)", "화(火)", "토(土)",
        "토(土)", "금(金)", "금(金)", "수(水)", "수(水)"
    };

    // ── 지지 오행 (자축인묘진사오미신유술해) ──────────────────────────────────
    public static final String[] BRANCH_OHAENG = {
        "수(水)", "토(土)", "목(木)", "목(木)", "토(土)", "화(火)",
        "화(火)", "토(土)", "금(金)", "금(金)", "토(土)", "수(水)"
    };

    // 오행 인덱스: 목=0 화=1 토=2 금=3 수=4
    private static final int[] STEM_OHAENG_IDX   = {0, 0, 1, 1, 2, 2, 3, 3, 4, 4};
    private static final int[] BRANCH_OHAENG_IDX = {4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4};

    /**
     * 2000-01-01 = JDN 2,451,545 = 甲午일 (index 30)
     * → 甲子 기준 JDN = 2,451,515
     */
    private static final long GAP_JA_BASE_JDN = 2_451_515L;

    // ─────────────────────────────────────────────────────────────────────────
    // JDN 계산 (Gregorian → Julian Day Number)
    // 검증: 2000-01-01 = JDN 2,451,545 (국제 표준값)
    // 공식: Astronomical Algorithms (Jean Meeus), Gregorian 역법 적용
    // ─────────────────────────────────────────────────────────────────────────
    public static long toJDN(int year, int month, int day) {
        long a = (14 - month) / 12;          // 1월·2월 = 1, 나머지 = 0
        long y = year + 4800 - a;
        long m = month + 12 * a - 3;
        return day
             + (153L * m + 2) / 5
             + 365L * y
             + y / 4
             - y / 100
             + y / 400
             - 32045;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 년주
    // ─────────────────────────────────────────────────────────────────────────
    public static int yearStemIdx(int year)   { return ((year - 4) % 10  + 10)  % 10; }
    public static int yearBranchIdx(int year) { return ((year - 4) % 12  + 12)  % 12; }

    // ─────────────────────────────────────────────────────────────────────────
    // 월주 (절기 기준 근사 — 양력월 매핑)
    // 1월→丑(1), 2월→寅(2), …, 11월→亥(11), 12월→子(0)
    // ─────────────────────────────────────────────────────────────────────────
    public static int monthBranchIdx(int month) { return month % 12; }

    public static int monthStemIdx(int yearStemIdx, int monthBranchIdx) {
        // 오호둔년법: 甲己→丙, 乙庚→戊, 丙辛→庚, 丁壬→壬, 戊癸→甲
        int[] start = {2, 4, 6, 8, 0};
        return (start[yearStemIdx % 5] + (monthBranchIdx - 2 + 12) % 12) % 10;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 일주 (JDN 기반 60간지 순환)
    // ─────────────────────────────────────────────────────────────────────────
    public static int dayGanjiIdx(int year, int month, int day) {
        long diff = toJDN(year, month, day) - GAP_JA_BASE_JDN;
        return (int) (((diff % 60) + 60) % 60);
    }

    public static int dayStemIdx(int year, int month, int day)   { return dayGanjiIdx(year, month, day) % 10; }
    public static int dayBranchIdx(int year, int month, int day) { return dayGanjiIdx(year, month, day) % 12; }

    // ─────────────────────────────────────────────────────────────────────────
    // 시주
    // ─────────────────────────────────────────────────────────────────────────
    public static int hourBranchIdx(int hour) {
        return hour == 23 ? 0 : (hour + 1) / 2;
    }

    public static int hourStemIdx(int dayStemIdx, int hourBranchIdx) {
        // 오서둔일법: 甲己→甲子, 乙庚→丙子, 丙辛→戊子, 丁壬→庚子, 戊癸→壬子
        int[] start = {0, 2, 4, 6, 8};
        return (start[dayStemIdx % 5] + hourBranchIdx) % 10;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 공개 편의 메서드
    // ─────────────────────────────────────────────────────────────────────────

    /** 일간(日干) 오행 문자열 — 사주에서 '나'를 대표하는 핵심 오행 */
    public static String dayStemOhaeng(int year, int month, int day) {
        return STEM_OHAENG[dayStemIdx(year, month, day)];
    }

    /**
     * Claude 프롬프트용 사주팔자 전체 텍스트
     * 년주·월주·일주·시주 + 오행 분포 포함
     */
    public static String buildSajuText(int year, int month, int day, Integer hour) {
        int ys = yearStemIdx(year);
        int yb = yearBranchIdx(year);
        int mb = monthBranchIdx(month);
        int ms = monthStemIdx(ys, mb);
        int ds = dayStemIdx(year, month, day);
        int db = dayBranchIdx(year, month, day);

        StringBuilder sb = new StringBuilder();
        sb.append("  년주: ").append(STEMS[ys]).append(BRANCHES[yb])
          .append("  [천간 ").append(STEM_OHAENG[ys]).append(" / 지지 ").append(BRANCH_OHAENG[yb]).append("]\n");
        sb.append("  월주: ").append(STEMS[ms]).append(BRANCHES[mb])
          .append("  [천간 ").append(STEM_OHAENG[ms]).append(" / 지지 ").append(BRANCH_OHAENG[mb]).append("]\n");
        sb.append("  일주: ").append(STEMS[ds]).append(BRANCHES[db])
          .append("  [천간 ").append(STEM_OHAENG[ds]).append(" / 지지 ").append(BRANCH_OHAENG[db])
          .append("]  ← 일간(").append(STEMS[ds]).append(")이 이 사람 자신을 나타내는 핵심\n");

        if (hour != null) {
            int hb = hourBranchIdx(hour);
            int hs = hourStemIdx(ds, hb);
            sb.append("  시주: ").append(STEMS[hs]).append(BRANCHES[hb])
              .append("  [천간 ").append(STEM_OHAENG[hs]).append(" / 지지 ").append(BRANCH_OHAENG[hb]).append("]\n");
        } else {
            sb.append("  시주: 미상\n");
        }

        // 오행 분포 집계
        int[] cnt = new int[5]; // 목화토금수
        addCount(cnt, ys, yb);
        addCount(cnt, ms, mb);
        addCount(cnt, ds, db);
        if (hour != null) {
            int hb = hourBranchIdx(hour);
            int hs = hourStemIdx(ds, hb);
            addCount(cnt, hs, hb);
        }
        sb.append("  오행 분포: 목(木)").append(cnt[0])
          .append(" / 화(火)").append(cnt[1])
          .append(" / 토(土)").append(cnt[2])
          .append(" / 금(金)").append(cnt[3])
          .append(" / 수(水)").append(cnt[4]);

        return sb.toString();
    }

    /** 오늘 일주(日柱) 텍스트 — 운세 프롬프트용 */
    public static String buildTodayJuText(int year, int month, int day) {
        int ds = dayStemIdx(year, month, day);
        int db = dayBranchIdx(year, month, day);
        return String.format("  오늘 일주: %s%s  [천간 %s / 지지 %s]  (양력 %d-%02d-%02d)",
                STEMS[ds], BRANCHES[db], STEM_OHAENG[ds], BRANCH_OHAENG[db], year, month, day);
    }

    private static void addCount(int[] cnt, int stem, int branch) {
        cnt[STEM_OHAENG_IDX[stem]]++;
        cnt[BRANCH_OHAENG_IDX[branch]]++;
    }
}
