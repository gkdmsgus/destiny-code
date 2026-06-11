package com.destinycode.saju.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SajuRequest {

    @NotBlank(message = "이름은 필수 항목입니다.")
    private String name;

    @NotBlank(message = "성별은 필수 항목입니다.")
    @Pattern(regexp = "^(MALE|FEMALE)$", message = "성별은 MALE 또는 FEMALE 이어야 합니다.")
    private String gender;

    @NotBlank(message = "달력 기준은 필수 항목입니다.")
    @Pattern(regexp = "^(SOLAR|LUNAR_PLAIN|LUNAR_LEAP)$",
             message = "달력 기준은 SOLAR, LUNAR_PLAIN, LUNAR_LEAP 중 하나여야 합니다.")
    private String calendarType;

    @NotNull(message = "태어난 연도는 필수 항목입니다.")
    @Min(value = 1900, message = "연도는 1900년 이후여야 합니다.")
    @Max(value = 2100, message = "연도는 2100년 이전이어야 합니다.")
    private Integer birthYear;

    @NotNull(message = "태어난 월은 필수 항목입니다.")
    @Min(value = 1, message = "월은 1 ~ 12 사이여야 합니다.")
    @Max(value = 12, message = "월은 1 ~ 12 사이여야 합니다.")
    private Integer birthMonth;

    @NotNull(message = "태어난 일은 필수 항목입니다.")
    @Min(value = 1, message = "일은 1 ~ 31 사이여야 합니다.")
    @Max(value = 31, message = "일은 1 ~ 31 사이여야 합니다.")
    private Integer birthDay;

    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
             message = "태어난 시간은 HH:mm 형식이어야 합니다.")
    private String birthTime; // null 허용

    @NotBlank(message = "태어난 장소는 필수 항목입니다.")
    private String birthPlace;
}
