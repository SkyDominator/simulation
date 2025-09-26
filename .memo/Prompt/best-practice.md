# Best prompt patterns

1. Raise question
    1. If there are things that need to be clarified by myself (when there are multiple best practice options or when it is a matter of taste, of future environment, or of future implementation, etc.), stop writing plan and just raise me questions with the listing and the explanations for each list item about the possible best options.
2. Tag `NEED_VERIFICATION` on ambiguous parts
    1. If there are things that need to be clarified by myself (when there are multiple best practice options or when it is a matter of taste, of future environment, or of future implementation, etc.), stop writing plan and just tag `NEED_VERIFICATION` on the ambiguous items.
3. Review
    1. I'm reviewing plans. Go through my reviews and apply my reviews only if they are reasonable. If not, stop and raise questions. If you are 100% sure of your original plan contents, you can ignore my reviews with providing some explanations.
4. Reasoning
    1. Do the tasks I requested or apply my ideas ONLY IF they are reasonable after considering the following "3 priorities list" (the order of list items means the priority, and the higher priority can outweigh or ignore the lower priority in conflicting situations, but take all of them into account if they are not conflicting to each other).
        1. 1st Priority: The environments of my application in market perspective
            1. e.g., the number of the total users, the number of concurrent users, the target devices, the target regions, the target OS including versions, the target browsers including versions, the network (online or offline)
        2. 2nd Priority: The requirements and constraints of my application in technical perspective
            1. e.g., the application type (web, mobile, desktop, embedded, etc.), the application architecture (monolith, microservices, serverless, etc.), the tech stack (programming languages, frameworks, libraries, databases, etc.), the performance requirements (latency, throughput, etc.), the security requirements (data protection, authentication, authorization, etc.), the scalability requirements (horizontal scaling, vertical scaling, etc.), the maintainability requirements (code quality, documentation, testing, etc.)
        3. 3rd Priority: The best practices and standards in the industry given my application type, scale, and environment
    2. If my requests or ideas are NOT reasonable after considering the above list, stop and raise questions with alternative suggestions that are more reasonable along with explanations for each suggestion.
    3. When you make a decision, first provide reasoning for your choice to yourself. Explain to yourself why you chose a particular option over others, considering the above 3 priorities list. Then, review your decision and its reasonings if they are truly reasonable.
5. Review & Refine loop
    1. There are 3 steps in total, and you will loop through them until no issue-suggestion pair (except `NEED_DECISION` tagged items) is found in the new $REVIEW_FILE.
        1. Review
        2. Refinement
        3. Goes back to Step 1, and repeat Steps 1~3
6. Review Plan
   1. I'm reviewing plans. Go through my reviews and apply my reviews only if they are reasonable. If not, stop and raise questions. If you are 100% sure of your original plan contents, you can ignore my reviews with providing some explanations.
7. Format consistency
    1. When modifying [SSD](/.memo/CE/specs/SSD.md), maintain the structure, format, and the style used in the original text. After the suggested change was applied to the original contents, the contents structure and flow should be natural as it was created as it is, not modified interim. So, do not use the expressions that emphasize the changes you made in any way, unless explicitly instructed to do so. Provide the final output as if it was originally written that way.
8. Completeness of documents
    1. Within-page 
        1. consistency
            1. Ensure that all contents within the document page are consistent with each other. They should not contradict each other or there should be no ambiguity.
        2. no redundancy
            1. Ensure that there is no redundancy within the document page. If there are redundant contents, consolidate them into one and remove the others.
        3. level of contents abstraction
            1. Ensure that the level of abstraction of the contents are consistent within a page. For example, if a page is about high-level architecture, it should not contain low-level implementation details. If a page is about low-level implementation details, it should not contain high-level architecture.
    2. Cross-page
        1. Consistency
            1. Ensure that all pages are consistent to each other. A content in a page should not conflict with another content in another page. No ambiguity should exist between pages.
        2. No redundancy
            1. Ensure that there is no redundancy between pages. If there are redundant contents between pages, consolidate them into one and remain it only in one page.