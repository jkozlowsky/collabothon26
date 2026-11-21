package com.collabothon.back.glossary;

import org.springframework.data.jpa.repository.JpaRepository;

interface GlossaryPreferenceRepository extends JpaRepository<GlossaryPreference, String> {
}
