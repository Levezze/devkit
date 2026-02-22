---
name: ask
description: Answer questions without writing code to the codebase. Q&A only.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
---

Answer the user's question WITHOUT writing, editing, or creating any codebase files. This is for Q&A only in the CLI chat interface.

- DO NOT write, edit, or modify any codebase files
- ONLY answer questions in the chat interface
- Provide code examples in chat (code blocks) but never save them to files
- If user asks to implement something, explain HOW but don't actually do it

The user's question: $ARGUMENTS
