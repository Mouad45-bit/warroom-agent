package com.warroom.server.dto;

public record AddCountermeasureRequest(
        String type,               // "BLOCK_IP", "DISABLE_ACCOUNT", etc.
        String description,        // Obligatoire — ce qui a été fait
        String technicalCommand    // Optionnel — la commande exacte
) {}