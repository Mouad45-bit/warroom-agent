package com.warroom.server.dto;

public record AddNoteRequest(
        String content   // Le texte de la note — obligatoire
) {}