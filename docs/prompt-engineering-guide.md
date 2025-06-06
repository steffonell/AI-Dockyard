
## Prompt Structure Framework
USE FOLLOWING INSTRUCTIONS FOR CREATING THE PERFECT PROMPT BASED ON USER INPUT
### Essential Components

Every well-structured prompt should include these discrete blocks in order:

#### 1. System/Role Definition
- **Purpose**: Establishes the AI's persona and expertise level
- **Format**: "You are a [specific role] with expertise in [domain]..."
- **Example**: "You are a senior React architect with 10+ years of experience in modern web development."

#### 2. Context Block
- **Purpose**: Provides relevant background information
- **Guidelines**: 
  - Include only necessary background information
  - Keep to 3-4 sentences maximum
  - Focus on information that directly impacts the task

#### 3. Task Instruction
- **Purpose**: Clearly defines what the AI should do
- **Guidelines**:
  - Use single, clear action verbs: "Generate", "Classify", "Summarize", "Analyze"
  - Be specific and unambiguous
  - Avoid multiple conflicting instructions

#### 4. Output Format Specification
- **Purpose**: Defines the expected response structure
- **Options**:
  - JSON schema
  - Structured lists
  - Tables
  - Plain prose with specific formatting
  - Code blocks with language specification

#### 5. Examples (Few-Shot Learning)
- **When to use**:
  - Skip for simple, trivial tasks
  - Use 1-2 examples for structural guidance
  - Use 3-5 examples for complex or critical tasks
- **Purpose**: Demonstrates the expected pattern and quality

#### 6. Reasoning Cues (Optional)
- **When to use**: Complex problems requiring multi-step thinking
- **Common phrases**:
  - "Think step-by-step"
  - "Show your reasoning process"
  - "Explain your chain-of-thought before providing the final answer"

### Standard Template

```markdown
## System
You are an expert [ROLE] with [SPECIFIC_EXPERTISE].

## Context
[Concise background information - maximum 3-4 sentences]

## Task
[Single, clear instruction using action verb]

## Output Format
[Specific format requirements]

## Examples
[Zero, one, or few-shot examples as needed]

## Constraints
- [Specific limitations or requirements]
- [Additional guidelines]
```

## Prompt Engineering Techniques

### Technique Selection Guide

| Technique | Use Case | Implementation |
|-----------|----------|----------------|
| **Zero-Shot** | Simple Q&A, factual lookups | Use standard template without examples |
| **One-Shot/Few-Shot** | Consistent structure/style needed | Include 1-5 worked examples |
| **Chain-of-Thought** | Math, logic, multi-step reasoning | Add "Think step-by-step" instruction |
| **Step-Back Prompting** | Generic responses need improvement | 1. Ask broad question → 2. Use answer as context → 3. Ask specific task |
| **Self-Consistency** | Critical decisions/classifications | Run same prompt 5-7 times, use majority vote |
| **Tree-of-Thought** | Complex planning/strategy | Requires framework implementation |
| **ReAct/Tool Use** | External data/computation needed | Provide tool access or agent framework |

### Advanced Techniques

#### Chain-of-Thought Prompting
- **Trigger**: Mathematical problems, logical reasoning, multi-step analysis
- **Implementation**: Add explicit reasoning instructions
- **Example phrase**: "Before providing your final answer, work through this step-by-step, showing your reasoning at each stage."

#### Self-Consistency
- **Trigger**: High-stakes decisions or classifications
- **Implementation**: Generate multiple responses and select the most consistent answer
- **Process**: Run the same prompt 5-7 times with slight temperature variation

#### Step-Back Prompting
- **Trigger**: When responses are too generic or lack depth
- **Process**:
  1. Ask a broad, conceptual question about the topic
  2. Use the response as additional context
  3. Ask the specific task with enriched context

## Best Practices Checklist

### Core Principles
- ✅ **Simplicity First**: Start with minimal complexity, add detail only when needed
- ✅ **Positive Instructions**: Specify what to do rather than what to avoid
- ✅ **Clear Constraints**: Define boundaries and limitations explicitly
- ✅ **Consistent Format**: Use standardized structure across similar tasks

### Optimization Guidelines
- **Token Management**: Balance context richness with token efficiency
- **Variable Usage**: Use placeholders ({{variable}}) for scalable implementations
- **Iterative Refinement**: Test and refine prompts based on output quality
- **Version Control**: Track prompt changes and performance metrics

### Quality Assurance
- **Output Validation**: Verify responses meet format and content requirements
- **Edge Case Testing**: Test with unusual or boundary inputs
- **Consistency Checking**: Ensure similar inputs produce consistent outputs
- **Performance Monitoring**: Track response quality over time

## Decision Flow for Prompt Design

```
1. Define Goal
   ↓
2. Is output format crucial?
   → Yes: Add explicit schema + examples
   → No: Continue to step 3
   ↓
3. Is task multi-step?
   → Yes: Add Chain-of-Thought reasoning
   → No: Continue to step 4
   ↓
4. Need external information?
   → Yes: Implement ReAct/tool usage
   → No: Configure parameters and execute
   ↓
5. Test and iterate based on results
```

## Quick Reference Checklist

### Essential Elements (Always Include)
1. **Role Definition**: Clear expertise and persona
2. **Context**: Relevant background information
3. **Task**: Specific, actionable instruction

### Conditional Elements (Include When Needed)
4. **Format Specification**: When structure matters
5. **Examples**: When pattern demonstration is helpful
6. **Reasoning Cues**: When accuracy is critical

### Parameter Tuning Priority
1. **Temperature**: Primary creativity control
2. **Max Tokens**: Response length management
3. **Other parameters**: Only adjust when necessary

### Validation Steps
1. **Clarity Check**: Is the instruction unambiguous?
2. **Completeness Check**: Are all necessary components included?
3. **Efficiency Check**: Is the prompt as concise as possible while maintaining effectiveness?
4. **Consistency Check**: Will similar inputs produce consistent outputs?

## Common Pitfalls to Avoid

- **Over-complexity**: Adding unnecessary instructions or examples
- **Ambiguous Instructions**: Using vague or conflicting directives
- **Missing Context**: Failing to provide necessary background information
- **Format Neglect**: Not specifying expected output structure
- **Token Waste**: Including irrelevant information that consumes token budget
- **Inconsistent Style**: Mixing different instruction formats within the same prompt

USER INPUT:
