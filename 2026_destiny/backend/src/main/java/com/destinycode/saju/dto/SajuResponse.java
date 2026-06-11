package com.destinycode.saju.dto;

import com.destinycode.saju.SajuInfo;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SajuResponse {

    private Long id;
    private String name;
    private String gender;
    private String calendarType;
    private Integer birthYear;
    private Integer birthMonth;
    private Integer birthDay;
    private String birthTime;
    private String birthPlace;
    private String imageData;
    private Boolean imageReady;   // 이미지 생성 완료 여부 (비동기)
    private CharacterSummary characterSummary;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CharacterSummary {
        private String element;
        private String className;
        private String title;
        private String description;
        /** Claude JSON 상세 데이터 (성격/신분/능력/배경/명언 등) */
        private String characterDetail;
    }

    /** DB에 저장된 description 으로 CharacterSummary 를 조립해 반환 */
    public static SajuResponse fromSaved(SajuInfo info) {
        CharacterSummary summary = null;
        if (info.getCharacterElement() != null) {
            summary = CharacterSummary.builder()
                    .element(info.getCharacterElement())
                    .className(info.getCharacterClassName())
                    .title(info.getCharacterTitle())
                    .description(info.getDescription())
                    .characterDetail(info.getCharacterDetail())
                    .build();
        }
        return SajuResponse.builder()
                .id(info.getId())
                .name(info.getName())
                .gender(info.getGender())
                .calendarType(info.getCalendarType())
                .birthYear(info.getBirthYear())
                .birthMonth(info.getBirthMonth())
                .birthDay(info.getBirthDay())
                .birthTime(info.getBirthTime())
                .birthPlace(info.getBirthPlace())
                .imageData(info.getImageData())
                .imageReady(info.getImageReady())
                .characterSummary(summary)
                .build();
    }

    public static SajuResponse from(SajuInfo info, CharacterSummary summary) {
        return SajuResponse.builder()
                .id(info.getId())
                .name(info.getName())
                .gender(info.getGender())
                .calendarType(info.getCalendarType())
                .birthYear(info.getBirthYear())
                .birthMonth(info.getBirthMonth())
                .birthDay(info.getBirthDay())
                .birthTime(info.getBirthTime())
                .birthPlace(info.getBirthPlace())
                .imageData(info.getImageData())
                .imageReady(info.getImageReady())
                .characterSummary(summary)
                .build();
    }
}
