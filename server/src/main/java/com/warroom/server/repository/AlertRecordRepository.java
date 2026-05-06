package com.warroom.server.repository;

import com.warroom.server.entity.AlertRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlertRecordRepository extends JpaRepository<AlertRecord, Long> {
}