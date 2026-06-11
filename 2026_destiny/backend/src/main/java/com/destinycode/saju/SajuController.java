package com.destinycode.saju;

import com.destinycode.common.ApiResponse;
import com.destinycode.saju.dto.SajuRequest;
import com.destinycode.saju.dto.SajuResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Saju", description = "사주 분석 및 캐릭터 생성 API")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/saju")
@RequiredArgsConstructor
public class SajuController {

    private final SajuService sajuService;

    @Operation(summary = "사주 저장 및 캐릭터 생성",
               description = "사주 정보를 저장하고 Claude 분석 후 즉시 응답. 이미지는 백그라운드 생성 (imageReady: false → true)")
    @PostMapping
    public ResponseEntity<ApiResponse<SajuResponse>> saveSaju(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SajuRequest request) {
        SajuResponse response = sajuService.saveSaju(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "내 사주 조회", description = "저장된 사주 정보와 캐릭터 요약 반환")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<SajuResponse>> getMySaju(
            @AuthenticationPrincipal UserDetails userDetails) {
        SajuResponse response = sajuService.getSaju(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "오늘의 운세", description = "사주 + 오늘 일진 기반 Claude 운세 생성")
    @GetMapping("/me/fortune")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTodayFortune(
            @AuthenticationPrincipal UserDetails userDetails) {
        java.util.Map<String, Object> fortune = sajuService.getTodayFortune(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(fortune));
    }

    @Operation(summary = "이미지 생성 상태 확인",
               description = "imageReady가 true가 될 때까지 프론트에서 폴링. imageReady: true면 imageData 포함")
    @GetMapping("/me/image-status")
    public ResponseEntity<ApiResponse<SajuResponse>> getImageStatus(
            @AuthenticationPrincipal UserDetails userDetails) {
        SajuResponse response = sajuService.getImageStatus(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
