package com.collabothon.back.dto.converters.glossary;

import org.mapstruct.Mapper;

import com.collabothon.back.dto.glossary.CategoryDto;
import com.collabothon.back.dto.glossary.CategoryRef;
import com.collabothon.back.dto.glossary.TermDetail;
import com.collabothon.back.dto.glossary.TermHit;
import com.collabothon.back.dto.glossary.TermRef;
import com.collabothon.back.dto.glossary.TermSummary;
import com.collabothon.back.entities.glossary.GlossaryCategory;
import com.collabothon.back.entities.glossary.GlossaryTerm;

@Mapper(componentModel = "spring")
public interface GlossaryMapper {

	CategoryDto toCategoryDto(GlossaryCategory category);

	TermSummary toTermSummary(GlossaryTerm term);

	TermDetail toTermDetail(GlossaryTerm term);

	TermHit toTermHit(GlossaryTerm term);

	CategoryRef toCategoryRef(GlossaryCategory category);

	TermRef toTermRef(GlossaryTerm term);

}
