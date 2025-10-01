# Instruction

Read `.github/copilot-instructions.md` and `.memo/CE/specs/schema/schema.md` to understand my app. After that, update SSD.md for applying the following needs.

# The needs to be applied

I want to add a feature that, when the privacy policy was updated, every user (including authenticated users or the users on pre-auth stages) is redirected to the policy consent page and consent to the latest privacy policy and then continues to his desired task or the next step.

## Notes

* Follow the existing style, structure, and format of SSD.md as much as possible.
* The SSD.md does not include database schema details. For that, read `.memo/CE/specs/schema/schema.md`. You also need to update the schema on `schema.md` if necessary.
* For updating SSD.md, mark `NEED_VERIFICATION` on all the details if I (=developer and project owner) should decide, define, or confirm first, so that I can clarify the direction of next steps (researching, planning, and actual implementation of ocdes) for this app project.
* Do not mark "NEW" on the updated parts on SSD.md. I can track them with git diff.
