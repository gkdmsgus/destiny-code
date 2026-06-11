package com.destinycode.saju;

import com.destinycode.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SajuRepository extends JpaRepository<SajuInfo, Long> {
    Optional<SajuInfo> findByUser(User user);
}
