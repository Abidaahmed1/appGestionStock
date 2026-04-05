package com.gestionStock.backend.repository.parametre;

import com.gestionStock.backend.entity.parametre.DocumentDisplaySetting;
import com.gestionStock.backend.entity.parametre.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentDisplaySettingRepository extends JpaRepository<DocumentDisplaySetting, Long> {
    List<DocumentDisplaySetting> findByEntrepriseId(Long entrepriseId);
    Optional<DocumentDisplaySetting> findByEntrepriseIdAndDocumentType(Long entrepriseId, DocumentType documentType);
}
