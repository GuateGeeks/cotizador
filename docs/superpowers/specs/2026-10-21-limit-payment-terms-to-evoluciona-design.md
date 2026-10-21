# Limit payment terms to EVOLUCIONA

## Objective

Show the payment-terms block only for `EVOLUCIONA 8` and `EVOLUCIONA 16`.

## Design

The existing `isEvol` condition is the single source of truth for this eligibility. The render function will use it to hide the complete payment block for `FLEX · renta` and `INTEGRA · compra`.

No pricing formula, rental duration, offer description, filters, ownership copy, revenue simulation, or program data will change. FLEX will continue to calculate its total and term; it will simply omit the payment-terms presentation.

## Validation

1. EVO8 and EVO16 display the 20% initial payment and monthly installments.
2. FLEX and INTEGRA hide the full payment-terms block.
3. Switching modes recalculates the existing quote and all filters continue to work.
