package com.destinycode.ai;

import com.destinycode.saju.SajuInfo;
import com.destinycode.saju.SajuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * DALL-E 이미지 비동기 생성 전용 빈.
 *
 * ⚠️ @Async 는 같은 클래스 내부에서 호출하면 Spring AOP 프록시를 우회해서
 *    동기로 실행됩니다. 반드시 별도 빈(이 클래스)을 통해 호출해야 합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImageAsyncService {

    private final SajuRepository sajuRepository;
    private final OpenAiService  openAiService;

    @Async("imageExecutor")
    public void generateAndSave(Long sajuInfoId, String name, String gender,
                                String element, String className, String title) {
        log.info("[Async] DALL-E 이미지 생성 시작 — sajuInfoId: {}", sajuInfoId);
        try {
            String base64 = openAiService.generateCharacterImage(name, gender, element, className, title);
            if (base64 != null) {
                saveImage(sajuInfoId, base64);
                log.info("[Async] DALL-E 이미지 저장 완료 — sajuInfoId: {}", sajuInfoId);
            } else {
                log.warn("[Async] DALL-E 이미지 결과 없음 — sajuInfoId: {}", sajuInfoId);
            }
        } catch (Exception e) {
            log.error("[Async] DALL-E 이미지 생성 실패 — sajuInfoId: {}", sajuInfoId, e);
        }
    }

    @Transactional
    public void saveImage(Long sajuInfoId, String base64) {
        sajuRepository.findById(sajuInfoId).ifPresent(info -> {
            info.setImageData(base64);
            info.setImageReady(true);
            sajuRepository.save(info);
        });
    }
}
