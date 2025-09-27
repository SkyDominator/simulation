# Voice Agent System Specification - Updated Requirements

## Overview
A dual-model voice agent system that provides real-time conversation monitoring and correction, using a fast model for quick responses and a supervisor model for rule enforcement.

## User Experience Requirements

### Visual Output Format

#### Conversation Display
- **User Input**: Display in green text with prompt `User: ` where user types
- **Assistant Response**: Display in yellow text with label `Assistant: `
- **Supervisor Status**: Display immediately when determined:
  - ✅ Success: Cyan text showing `Supervisor: ✅ ON_TRACK`
  - ⚠️ Violation: Red text showing `Supervisor: ⚠️ NEEDS_ADJUSTMENT`
  - Supervisor reasoning shown in dimmed/gray text below status

#### Input Behavior
- User types at green `User: ` prompt
- No echo of user message after pressing ENTER
- **CRITICAL**: New `User: ` prompt MUST appear IMMEDIATELY after assistant response completes
- **User can type their next message WITHOUT WAITING for supervisor**
- Supervisor status appears asynchronously AFTER user prompt is already available

### Response Streaming
- Assistant responses stream character-by-character in real-time
- Yellow text appears progressively as response generates
- Smooth, immediate display without buffering

### Supervisor Behavior

#### Parallel Processing
- Supervisor runs ENTIRELY IN BACKGROUND as a separate thread/task
- **NEVER blocks the main conversation flow**
- Does NOT delay the appearance of the `User: ` prompt
- Multiple supervisor checks can run simultaneously for different messages
- Supervisor results appear "out of band" - they show up whenever ready, even mid-typing

#### Immediate Interruption
- When supervisor detects rule violation DURING streaming:
  - Streaming stops immediately mid-sentence
  - Supervisor status appears instantly
  - Correction message replaces incomplete response
- User sees clear indication of correction happening

#### Asynchronous Feedback
- Supervisor results appear as soon as ready, even if user has moved on
- Late corrections still displayed but marked as "late"
- **Supervisor status can appear WHILE user is typing their next message**
- Example timeline:
  1. Assistant finishes response
  2. `User: ` prompt appears IMMEDIATELY
  3. User starts typing
  4. Supervisor status appears below (user keeps typing uninterrupted)
- No blocking of conversation flow EVER

### Model Configuration

#### Small Model (Fast Responses)
- Uses Cerebras API with `gpt-oss-20b` model
- Optimized for speed and streaming
- Handles main conversation flow

#### Supervisor Model (Rule Enforcement)  
- Uses OpenAI GPT-5 with high reasoning effort
- Runs asynchronously without blocking
- Enforces business rules and corrections

### Example Interaction Flows

#### Immediate Correction (Violation Detected During Streaming)
```
User: Can you board my cat?

Assistant: Sure, we can boa--

Supervisor: ⚠️ NEEDS_ADJUSTMENT
Supervisor: We only board dogs here, not cats. Can I help you with boarding for your dog?

Assistant: Actually, we only board dogs here, not cats. Can I help you with boarding for your dog?

User: [ready to type immediately]
```

#### Normal Flow (No Violations)
```
User: What are your hours?

Assistant: We're open from 7 AM to 7 PM Monday through Saturday, and closed on Sundays.

Supervisor: ✅ ON_TRACK

User: [ready to type immediately]
```

#### Late Correction (Full Response Given, Then Corrected)
```


#### Real Example with Late Correction

User: hes 45 pounds, and i also need you to help wiht my cat winky

Assistant: Got it—thanks for the info on Gordo! Could you let me know the dates you’d like his boarding, and the best email to send the reservation details?

Also, we’d be happy to help with Winky. Could you share Winky’s breed/size and any special care instructions (e.g., medication, diet, or temperament notes)? That’ll ensure a smooth stay for both of them.

Supervisor: ✅ ON_TRACK

User: winky is a small green cat

Assistant: Thanks for letting me know about Winky! 🙂

Could you share the dates you’d like boarding for both Gordo (45 lb) and Winky, and the best email address to send the reservation details? If either pet has any special care needs (diet, meds, temperament), just let me know and we’ll take care of it!

Supervisor: ⚠️ NEEDS_ADJUSTMENT (late)
Supervisor: Oh wait, actually, we only care for dogs here – could you please provide Gordo’s boarding dates and your email address so we can move forward with his reservation?

Assistant: Oh wait, actually, we only care for dogs here – could you please provide Gordo's boarding dates and your email address so we can move forward with his reservation?

User: [ready to type immediately]
```

### Key Behavioral Requirements

1. **IMMEDIATE USER PROMPT**: The `User: ` prompt MUST appear the INSTANT the assistant finishes, with ZERO delay
2. **Background Supervisor**: Supervisor runs as completely separate background thread - NEVER blocks anything
3. **Non-Blocking Operation**: User can type while supervisor is still thinking/evaluating
4. **Out-of-Band Status**: Supervisor results appear asynchronously, even while user is mid-sentence typing
5. **Streaming Priority**: Assistant begins responding immediately without waiting for supervisor
6. **Instant Interruption**: When violations detected during streaming, stop immediately 
7. **Clear Visual Feedback**: Color-coded responses and supervisor status for easy scanning
8. **Full Async**: Complete asyncio implementation for optimal concurrency

### Critical Design Principle
The user should NEVER wait for the supervisor. The conversation flow is:
1. User types message
2. Assistant responds (streaming)
3. User prompt appears IMMEDIATELY when assistant done
4. User can start typing next message
5. Supervisor result appears whenever it's ready (could be while user is typing)

The supervisor is a "background watcher" that provides feedback when available but NEVER interrupts the user's ability to continue the conversation.