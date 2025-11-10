# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Steam Marketplace project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

ADRs are intended to be lightweight, easy to read, and practical. They help our team understand why we made specific architectural choices and provide a historical context for future decisions.

## ADR Format

Each ADR follows this structure:

- **Title**: Brief description of the decision
- **Status**: One of {Proposed, Accepted, Deprecated, Superseded}
- **Context**: The situation that led to this decision
- **Decision**: What we decided to do
- **Consequences**: Positive, negative, and neutral results of the decision
- **Implementation**: Code examples and technical details
- **Alternatives**: Other options we considered and why they were rejected
- **Related**: Links to related ADRs
- **References**: External resources and documentation

## Index of ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-use-clean-architecture.md) | Adopt Clean Architecture | Accepted | 2024-01-01 |
| [0002](0002-use-mongodb.md) | Use MongoDB with Mongoose ODM | Accepted | 2024-01-01 |
| [0003](0003-jwt-authentication.md) | Implement JWT Authentication with Refresh Tokens | Accepted | 2024-01-01 |
| [0004](0004-redis-caching.md) | Implement Redis Caching Layer | Accepted | 2024-01-01 |
| [0005](0005-circuit-breaker.md) | Implement Circuit Breaker Pattern | Accepted | 2024-01-01 |
| [0006](0006-ci-cd-pipeline.md) | GitHub Actions CI/CD Pipeline | Accepted | 2024-01-01 |
| [0007](0007-docker-containerization.md) | Docker Containerization Strategy | Accepted | 2024-01-01 |
| [0008](0008-monitoring-stack.md) | Prometheus, Grafana, and Alertmanager | Accepted | 2024-01-01 |

## How to Contribute

When making a significant architectural decision, create a new ADR following these steps:

### 1. Create a New ADR

Copy the template:

```bash
cp adr-template.md adr-XXXX-descriptive-title.md
```

Fill in the ADR with:
- The context of the problem
- The decision you made
- The consequences of the decision
- Any alternatives you considered

### 2. Numbering Convention

- Use the next sequential number
- Pad with zeros (e.g., 0001, 0002, not 1, 2)
- Keep the number even if previous ADRs are removed

### 3. Status Workflow

1. **Proposed** - ADR is in discussion
2. **Accepted** - Decision has been made and implemented
3. **Deprecated** - Decision is superseded but still relevant
4. **Superseded** - Replaced by a newer ADR

### 4. Review Process

- Share ADR in pull request
- Team reviews and discusses
- Merge when consensus is reached
- Change status to "Accepted" when implemented

## Best Practices

### When to Write an ADR

Write an ADR when you make a decision that:
- Affects the structure of the system
- Has long-term consequences
- Involves trade-offs between alternatives
- Is non-trivial or significant
- Will be questioned by future developers

### Good ADRs Are...

- **Clear**: Easy to understand, even for newcomers
- **Concise**: Include only necessary information
- **Factual**: Describe what was decided, not opinions
- **Complete**: Include context, decision, and consequences
- **Actionable**: Provide implementation details where relevant

### Example of a Good ADR

- Title clearly states the decision
- Context explains the problem or situation
- Decision is explicit and unambiguous
- Consequences cover both positive and negative aspects
- Alternatives are explained and rejected with reasons
- Code examples illustrate the implementation

## Questions and Answers

**Q: Do we need ADRs for every decision?**
A: No. Focus on significant decisions that have architectural impact. Simple choices (e.g., which logging library) don't need ADRs.

**Q: What if the ADR becomes outdated?**
A: Create a new ADR that supersedes the old one. Don't delete old ADRs - they provide historical context.

**Q: How detailed should the ADR be?**
A: Just detailed enough to be understood by someone who wasn't part of the original discussion. Include code examples for complex decisions.

**Q: Can I change an accepted ADR?**
A: No. ADRs are historical records. If you need to change the decision, create a new ADR that supersedes the old one.

**Q: Do ADRs need to be in English?**
A: Yes, for consistency and accessibility to the broader developer community.

## Related Resources

- [Michael Nygard's ADR Template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://github.com/npryce/adr-tools)
- [What is an ADR - Dev.to](https://dev.to/confirmdelivery/what-is-an-adr-2afi)
- [Documenting Architecture Decisions - Living with ADR](https://www.infoq.com/articles/documenting-architecture-decisions/)

## License

This ADR documentation is part of the Steam Marketplace project and is licensed under the MIT License.
