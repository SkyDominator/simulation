# Implementation Plan

Use `/.memo/CE/specs/SSD.md` as the Single Source of Truth (SST) and use `/.memo/CE/research/2025-09-16/policy-research.md` as the snapshot of the current codebase to create an implementation/update plan of the following feature

# Feature to be implemented

1. The privacy policy consent flow for both authenticated users and pre-auth users, as described in `/.memo/CE/specs/SSD.md`.
2. The required affiliated codes corresponds to the consent flow, as described in `/.memo/CE/specs/SSD.md`.

# Plan format

* Write and save your plan to `/.memo/CE/plans/2025-09-16/policy-plan.md`.
* Use the following format and style for the plan.
    * Reference example: `/.memo/CE/example1-plan.md`

# Notes

* SSD.md is the single source of truth (SST) for the plan. Go through SSD.md from the beginning to the end, and make sure that every part of the specification regarding the feature is covered in the plan. The current implementation should align with the specifications outlined in SSD.md. 
    * For example, the static fallback of the privacy policy content should be removed in the current codebase because SSD.md specifies that the content must be dynamically retrieved from the database. 
* If there is any ambiguity or missing details in SSD.md, mark `NEED_VERIFICATION` on the ambiguous parts in the plan file so that I can clarify the direction of next steps.