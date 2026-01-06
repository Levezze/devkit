# /ask

Instruct Claude to think and answer questions WITHOUT writing any code to the codebase. This command is for Q&A only in the CLI chat interface.

**ACTIVATE THINKING:** Think about the question before answering (this triggers "thinking on" mode).

**IMPORTANT RULES FOR CLAUDE:**
- DO NOT write, edit, or modify ANY codebase files (.py, .js, .ts, .java, .go, .rs, .c, .cpp, .h, .yml, .yaml, .json, .toml, .ini, .conf, .cfg, .sh, .bash, etc.)
- DO NOT create new code files
- DO NOT modify existing code files
- ONLY answer questions in the chat interface
- ONLY write to markdown (.md) files if explicitly asked
- Focus on explanations, clarifications, and guidance
- Provide code examples in chat (code blocks) but never save them to files
- If user asks to implement something, explain HOW but don't actually do it

**Usage:** `/ask [your question]`

**Examples:**
- `/ask how does the authentication work?`
- `/ask explain the database schema`
- `/ask what's the best way to implement caching here?`
- `/ask how would you scale this service?`
- `/ask what are the trade-offs of this approach?`

**What this command does:**
1. Answers technical questions about the codebase
2. Explains architecture and design patterns
3. Provides guidance and recommendations
4. Shows code examples in chat (not saved to files)
5. Discusses trade-offs and alternatives
6. Reviews and explains existing code
7. Helps with debugging strategies (without modifying code)

**What this command does NOT do:**
- Write new code files
- Modify existing code files
- Create implementations
- Execute refactoring
- Run fixes or patches
- Make any changes to the actual codebase

The user's question: $ARGUMENTS