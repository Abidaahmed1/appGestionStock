package com.gestionStock.backend.service.entreprise;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchemaMigrationService {

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void applyMigrations() {

    }
}
