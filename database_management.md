# Database Management Guide

This guide outlines the process for keeping your application's data model in sync with your Supabase database schema using generated TypeScript types. This approach maintains consistency and reduces manual errors by treating your database schema as the single source of truth.

## Overview

This project uses the Supabase CLI to generate TypeScript types directly from the database schema. The generated `lib/database.types.ts` file serves as the single source of truth for all database types within the application, ensuring type safety and consistency.

## Current Implementation

The project has been successfully migrated to use generated types with the following structure:

### Type Definitions
- **`CareTask`**: `Database['public']['Tables']['tasks']['Row']` - Complete task record
- **`CareTaskInsert`**: `Database['public']['Tables']['tasks']['Insert']` - Data for creating new tasks
- **`CareTaskUpdate`**: `Database['public']['Tables']['tasks']['Update']` - Data for updating existing tasks

### Key Files
- **`lib/database.types.ts`**: Generated types from Supabase CLI (auto-generated, do not edit manually)
- **`lib/supabase.ts`**: Supabase client with typed Database interface
- **`lib/supabaseService.ts`**: Service layer using generated types for all operations
- **`lib/taskStorage.ts`**: Storage abstraction layer with full type safety

## Workflow Process

### 1. Making Database Schema Changes

When you need to modify your database schema:

1. **Create a new migration file** in `supabase/migrations/`
   ```bash
   # Example filename: add_new_column.sql
   ```

2. **Write your migration SQL** following the established patterns:
   ```sql
   /*
     # Migration Description
     
     1. Changes Made
       - Description of what this migration does
     
     2. Security
       - Any RLS policy changes
   */
   
   -- Your SQL changes here
   ALTER TABLE tasks ADD COLUMN new_field text;
   ```

3. **Apply the migration** to your Supabase project (this happens automatically when you push to your repository)

### 2. Update TypeScript Types

After any schema changes, regenerate the TypeScript types:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

### 3. Update Application Code

With the new types generated, TypeScript will automatically:
- ✅ **Catch type mismatches** at compile time
- ✅ **Provide accurate autocomplete** in your IDE
- ✅ **Highlight breaking changes** that need attention

Review and update any code that TypeScript flags as incompatible with the new schema.

### 4. Test and Deploy

1. **Test locally** to ensure all type changes work correctly
2. **Run TypeScript checks** to catch any remaining issues
3. **Test database operations** to verify functionality
4. **Commit and deploy** your changes

## Benefits of This Approach

- **🔒 Type Safety**: Compile-time checking prevents runtime database errors
- **🚀 Developer Experience**: Full IDE support with autocomplete and IntelliSense
- **🔄 Consistency**: Database schema is the authoritative source for all types
- **⚡ Early Error Detection**: TypeScript catches schema mismatches before deployment
- **📚 Self-Documenting**: Types serve as living documentation of your database structure
- **🛡️ Refactoring Safety**: Large-scale changes are safer with type checking

## Best Practices

### Migration Management
1. **One logical change per migration** - Keep migrations focused and atomic
2. **Descriptive migration names** - Use clear, descriptive filenames
3. **Document changes** - Include detailed comments in migration files
4. **Test migrations** - Verify migrations work in development before production

### Type Generation
1. **Regenerate after every schema change** - Always update types after migrations
2. **Commit generated types** - Include `database.types.ts` in version control
3. **Automate in CI/CD** - Consider adding type generation to your deployment pipeline
4. **Review type changes** - Check generated types for unexpected changes

### Code Organization
1. **Use specific types** - Prefer `CareTaskInsert` over generic `CareTask` for inserts
2. **Centralize database operations** - Keep all database logic in service layers
3. **Handle type evolution** - Plan for schema changes in your application architecture

## Migration Checklist

When making database changes, follow this checklist:

- [ ] Create descriptive migration file in `supabase/migrations/`
- [ ] Include detailed comments explaining the changes
- [ ] Test migration locally
- [ ] Apply migration to Supabase project
- [ ] Regenerate TypeScript types using Supabase CLI
- [ ] Update application code to use new types
- [ ] Fix any TypeScript compilation errors
- [ ] Test all affected functionality
- [ ] Commit all changes including generated types
- [ ] Deploy to production

## Troubleshooting

### Common Issues

**TypeScript errors after schema changes:**
- Regenerate types: `supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts`
- Check for breaking changes in the generated types
- Update application code to match new schema

**Missing or incorrect types:**
- Verify migration was applied successfully
- Check Supabase project ID is correct
- Ensure you have the latest Supabase CLI version

**Type mismatches:**
- Review the generated `Database` interface in `database.types.ts`
- Update your application code to match the expected types
- Use the appropriate type (`Row`, `Insert`, or `Update`) for each operation

## Example Workflow

Here's a complete example of adding a new field to the tasks table:

1. **Create migration** (`supabase/migrations/add_priority_field.sql`):
   ```sql
   /*
     # Add priority field to tasks
     
     1. Changes Made
       - Add priority column to tasks table (low, medium, high)
       - Set default value to 'medium'
     
     2. Security
       - No RLS policy changes needed
   */
   
   ALTER TABLE tasks ADD COLUMN priority text DEFAULT 'medium';
   ```

2. **Regenerate types**:
   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
   ```

3. **Update application code** - TypeScript will guide you to update any code that needs the new field

4. **Test and deploy** - Verify everything works with the new schema

This workflow ensures your application stays in perfect sync with your database schema while maintaining full type safety throughout the development process.