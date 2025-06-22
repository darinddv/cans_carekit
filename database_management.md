# Database Management Guide

This guide outlines the process for keeping your application's data model in sync with your Supabase database schema, similar to how an ORM handles migrations and model definitions. This approach maintains consistency and reduces manual errors.

## Overview

The most effective way to achieve this with Supabase is by using the Supabase CLI to generate TypeScript types directly from your database schema. This generated file serves as the single source of truth for your database types within your application.

## Workflow Process

### 1. Install Supabase CLI

If you haven't already, install the Supabase CLI on your local machine. This tool allows you to interact with your Supabase project from your terminal, including generating types.

```bash
npm install -g supabase
```

### 2. Generate TypeScript Types

Run a command using the Supabase CLI to generate a TypeScript file that reflects your current database schema. This command connects to your Supabase project and creates a `types.ts` (or similar) file containing all the necessary type definitions for your tables, views, and functions.

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

### 3. Update `lib/supabase.ts`

Replace the manually defined `Database` type in `lib/supabase.ts` with the `Database` type exported from the newly generated types file. This ensures that your Supabase client is always using the most up-to-date schema definition.

```typescript
import { Database } from './database.types';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // ... configuration
});
```

### 4. Refine `CareTask` Interface

Update the `CareTask` interface in `lib/supabaseService.ts` to directly reference or extend the generated type for the `tasks` table. For example, you could import the `Tables` type from your generated file and define `CareTask` as `Database['public']['Tables']['tasks']['Row']`. This ensures that your `CareTask` interface is always consistent with the database schema.

```typescript
import { Database } from './database.types';

export type CareTask = Database['public']['Tables']['tasks']['Row'];
```

### 5. Adjust `SupabaseService` and `taskStorage`

Review and adjust any methods in `lib/supabaseService.ts` and `lib/taskStorage.ts` that interact with the `tasks` table. With the updated `CareTask` interface and `Database` type, TypeScript will help you identify any inconsistencies, making it easier to adapt your queries and data handling logic to schema changes.

## Benefits

- **Type Safety**: Automatic TypeScript types ensure compile-time checking
- **Consistency**: Single source of truth for database schema
- **Error Prevention**: TypeScript catches schema mismatches early
- **Developer Experience**: Better IDE support with autocomplete and IntelliSense
- **Maintainability**: Easier to refactor and update database interactions

## Best Practices

1. **Regenerate Types After Schema Changes**: Always regenerate types after creating new migrations
2. **Version Control**: Commit generated types to version control
3. **Automation**: Consider adding type generation to your CI/CD pipeline
4. **Documentation**: Keep this guide updated as your workflow evolves

## Migration Workflow

1. Create new migration file in `supabase/migrations/`
2. Apply migration to your Supabase project
3. Regenerate TypeScript types
4. Update application code to use new types
5. Test changes thoroughly
6. Commit all changes to version control

This workflow ensures that your database schema and application code stay in sync, reducing bugs and improving developer productivity.