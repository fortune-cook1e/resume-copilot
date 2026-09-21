# API working rules

## Modules and responsibilities

- Organize `src/` by business module, colocating its NestJS module, controller, service, and repository as needed. Use dependency injection and export only necessary providers.
- Controllers handle HTTP concerns; services own business rules and orchestration; repositories encapsulate persistence for modules that need it.
- Collaborate across modules through their exported capabilities, not another module's repositories or direct table access.
- Split services when distinct responsibilities emerge, not for file length alone. Avoid generic CRUD bases, mandatory interface layers, and a fixed file checklist for every module.
- These conventions guide agreed implementation work; they do not authorize creating infrastructure or migrating legacy Web behavior.

## Directory responsibilities

These are target responsibilities, not existing infrastructure; create directories and files only within an agreed implementation scope.

- `src/config/`: server configuration and startup validation.
- `src/database/`: connection providers, lifecycle management, and Drizzle schemas in `schema/`; keep business queries in their owning module's repository.
- `src/auth/`: authentication, session guards, and trusted user-context decorators; resource authorization remains with the owning business operation.
- `src/common/pipes/` and `src/common/filters/`: reusable input validation and HTTP error handling, not shared business logic or a miscellaneous utility collection.
- Repository-root `packages/contracts/`: public request / response schemas and inferred types, not internal business or database models.
- `test/`: API tests grouped by module and behavior; it is separate from `src/`.

### Target structure example

File names illustrate the responsibilities above, not a mandatory scaffold. For example, omit `resumes.types.ts` when no distinct internal business types are needed.

```text
apps/api/
  src/
    main.ts
    app.module.ts
    config/
      env.schema.ts
    database/
      database.module.ts
      database.provider.ts
      schema/
    auth/
      auth.module.ts
      session.guard.ts
      current-user.decorator.ts
    common/
      pipes/
        zod-validation.pipe.ts
      filters/
        http-exception.filter.ts
    resumes/
      resumes.module.ts
      resumes.controller.ts
      resumes.service.ts
      resumes.repository.ts
      resumes.types.ts
    experiences/
      ...
  test/
    app.test.mts
    resumes/
      save-resume.test.mts
```

## Contracts and types

- Define public request / response schemas and inferred types with Zod in `packages/contracts`; execute request validation at the HTTP boundary through pipes. Type annotations alone do not validate input.
- Do not duplicate Zod validation with a parallel class-validator model. Keep HTTP contracts independent of database models and framework decorators.
- Infer persistence types from Drizzle schemas. Add internal business types only when their meaning differs from transport or persistence structures.
- Explicitly map allowed response fields instead of returning database records directly; extract a mapper only when complexity or reuse warrants it.

## Security and runtime

- Establish trusted identity through server-side authentication; enforce resource authorization in business operations and scope database access to the authorized owner. Never trust a client-supplied identity as proof of ownership.
- Validate server configuration at startup. Manage database connections through NestJS application lifecycle hooks rather than opening connections in request handlers.
- Use consistent error handling: distinguish expected failures from internal exceptions and avoid exposing implementation details. Keep logs traceable without recording credentials, sessions, or sensitive resume content.
- Keep external integrations in providers belonging to the relevant module. Set timeouts and retry only when the operation's idempotency and failure semantics permit it.

## Persistence and transactions

- Services define transaction boundaries; repositories participating in one atomic operation must share its transaction context, not independently commit partial work.
- Enforce data integrity with database constraints as well as business validation. Define concurrency and duplicate-execution behavior for operations where those risks apply.
- Do not hold database transactions open across model calls or other slow external operations; design their failure and consistency handling in the relevant feature plan.

## Tests and verification

- Keep tests in `test/`, grouped by business module and behavior rather than mirroring every production file. Do not precreate separate test-layer directory trees.
- Follow the root risk-based testing strategy rather than requiring all business tests at the service layer. Use database integration tests for transactions / constraints and HTTP tests where request wiring or authorization behavior requires them.
- Database integration tests require an isolated test database; never use development or production data. Release application and database resources after tests.
- Run commands from the repository root with `pnpm --filter @resume-copilot/api <command>`. Validate relevant changes with `typecheck`, `lint`, `build`, and tests.
- The API test command builds first, checks test types, and runs Vitest against compiled application code. Preserve NestJS decorator metadata; do not replace this with a transform that drops it.
