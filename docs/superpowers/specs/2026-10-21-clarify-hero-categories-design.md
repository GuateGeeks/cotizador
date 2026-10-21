# Clarify hero category labels

## Objective

Remove the visible `Propuesta para Colegio Costa Sur` label from the hero header while retaining all other Colegio Costa Sur personalization. Replace the hero category chips with non-interactive descriptive text so they cannot be mistaken for buttons.

## Design

The header will retain the GuateGeeks brand link and remove only the adjacent proposal label. The category row will become the sentence `Áreas disponibles: Robótica · Electrónica · Drones · Experiencias inmersivas`.

The replacement will use plain text styling without borders, rounded containers, hover affordances, pointer cursor, button semantics, or click handlers. It remains responsive and conveys the same four areas.

## Validation

1. The visible hero header does not contain `Propuesta para Colegio Costa Sur`.
2. The personalized title, metadata, and footer remain unchanged.
3. The categories are presented as one non-interactive text line or responsive wrapped text.
4. The published page loads without console errors and its CSS and JavaScript remain available.
