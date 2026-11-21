package com.collabothon.back.dto.converters.profile;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import com.collabothon.back.dto.profile.ProfileDto;
import com.collabothon.back.entities.profile.UserProfile;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserProfileMapper {
	ProfileDto toDto(UserProfile profile);
}
