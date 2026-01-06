Creates comprehensive technical documentation using the documentation-scholar subagent.

**Usage:** `/document [optional context description]`

**Examples:**
- `/document` - Document current changes or implementation
- `/document the new authentication system` - Document specific feature
- `/document API endpoint changes` - Document API modifications
- `/document database schema updates` - Document schema changes
- `/document architecture decisions` - Create ADRs
- `/document user guide for the new feature` - Create user documentation

The documentation-scholar will:
1. Analyze the current state and recent changes
2. Identify what type of documentation is needed
3. Review existing documentation patterns in the project
4. Create professional documentation following detected standards
5. Ensure completeness and technical accuracy

**Documentation Types Generated:**
- README files and project documentation
- API documentation and references
- Architecture Decision Records (ADRs)
- Technical specifications
- User guides and tutorials
- Code documentation and comments
- Migration guides
- Configuration documentation

**Output Includes:**
- Structured markdown documentation
- Code examples and usage patterns
- Architecture diagrams (as ASCII/mermaid when applicable)
- Implementation details
- Testing considerations
- Maintenance notes

The documentation will follow professional standards with clear structure, no emojis (unless in existing project style), and comprehensive coverage appropriate to the context.

Context: $ARGUMENTS