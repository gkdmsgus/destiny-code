package com.destinycode.saju;

import com.destinycode.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "saju_info")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SajuInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String gender;

    @Column(name = "calendar_type", nullable = false)
    private String calendarType;

    @Column(name = "birth_year", nullable = false)
    private Integer birthYear;

    @Column(name = "birth_month", nullable = false)
    private Integer birthMonth;

    @Column(name = "birth_day", nullable = false)
    private Integer birthDay;

    @Column(name = "birth_time")
    private String birthTime;

    @Column(name = "birth_place", nullable = false)
    private String birthPlace;

    /** 오행 속성 (예: "화 (Fire)") */
    @Column(name = "character_element")
    private String characterElement;

    /** 직업 클래스명 */
    @Column(name = "character_class_name")
    private String characterClassName;

    /** 캐릭터 타이틀 */
    @Column(name = "character_title")
    private String characterTitle;

    /** Claude 생성 캐릭터 설명 — 최초 생성 시 저장, 이후 재호출 없음 */
    @Lob
    @Column(name = "description", columnDefinition = "LONGTEXT")
    private String description;

    /** Claude 생성 캐릭터 상세 데이터 (JSON) — 성격/신분/능력/배경/명언 등 */
    @Lob
    @Column(name = "character_detail", columnDefinition = "LONGTEXT")
    private String characterDetail;

    @Lob
    @Column(name = "image_data", columnDefinition = "LONGTEXT")
    private String imageData;

    /** DALL-E 이미지 생성 완료 여부 (비동기 처리) */
    @Column(name = "image_ready", nullable = false)
    @Builder.Default
    private Boolean imageReady = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
