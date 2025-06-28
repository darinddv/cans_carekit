# Navigation Design Documentation

This document provides comprehensive guidance on designing and implementing navigation in the Care Card application using Expo Router. It explains the design philosophy, patterns, and best practices to ensure consistent and maintainable navigation structures.

## Navigation Philosophy

The Care Card application follows a **hierarchical tab-based navigation** pattern that prioritizes:

1. **Role-based Access Control**: Different user roles (patients, providers) see different navigation options
2. **Logical Information Architecture**: Related features are grouped together
3. **Consistent User Experience**: Navigation patterns remain predictable across the app
4. **Scalable Structure**: Easy to add new features without breaking existing navigation

## Core Navigation Principles

### 1. Tab-First Architecture

The primary navigation uses tabs as the main organizational structure:

- **Tabs represent major app sections** (Profile, Care Card, Messages, Provider Portal)
- **Each tab can contain a stack of screens** for hierarchical navigation within that section
- **Tabs are role-aware** and show/hide based on user permissions

### 2. Nested Navigation Hierarchy

```
App Root
├── Login Screen (when not authenticated)
└── (tabs) - Main Tab Navigator
    ├── index (Profile) - Always visible
    ├── care-card - Patient only
    ├── symptoms - Patient only  
    ├── insights - Patient only
    ├── health-metrics - Patient only
    ├── messages - Both roles
    └── provider/ - Provider only (Stack Navigator)
        ├── index - Provider dashboard
        ├── manage-patients - Patient management
        └── patient-symptoms - Individual patient data
```

### 3. Role-Based Visibility

Navigation elements are conditionally rendered based on user roles:

```typescript
// In (tabs)/_layout.tsx
const isProvider = userProfile?.role === 'provider';
const isPatient = userProfile?.role === 'patient' || !userProfile?.role;

<Tabs.Screen
  name="provider"
  options={{
    href: isProvider ? undefined : null, // Hide for patients
  }}
/>
```

## File Structure Patterns

### Standard Tab Screen

For simple tab screens that don't need nested navigation:

```
app/(tabs)/
├── _layout.tsx          # Tab navigator configuration
├── index.tsx            # Profile tab (default)
├── care-card.tsx        # Care Card tab
├── symptoms.tsx         # Symptoms tab
├── insights.tsx         # Insights tab
├── health-metrics.tsx   # Health Metrics tab
└── messages.tsx         # Messages tab
```

### Nested Stack Navigation

For tabs that need multiple screens (like the Provider portal):

```
app/(tabs)/
├── _layout.tsx          # Tab navigator configuration
└── provider/            # Provider tab with nested screens
    ├── _layout.tsx      # Stack navigator for provider screens
    ├── index.tsx        # Provider dashboard (default screen)
    ├── manage-patients.tsx    # Patient management screen
    └── patient-symptoms.tsx   # Patient symptom details screen
```

## Implementation Patterns

### 1. Tab Layout Configuration

The main tab layout (`app/(tabs)/_layout.tsx`) handles:

- **Tab visibility based on user roles**
- **Responsive design for different screen sizes**
- **Icon and title configuration**
- **Loading states while user profile loads**

```typescript
export default function TabLayout() {
  const { userProfile, isLoading } = useUser();

  // Show loading screen while user profile loads
  if (isLoading) {
    return <LoadingScreen />;
  }

  const isProvider = userProfile?.role === 'provider';
  const isPatient = userProfile?.role === 'patient' || !userProfile?.role;

  return (
    <Tabs screenOptions={{ /* ... */ }}>
      {/* Always visible tabs */}
      <Tabs.Screen name="index" options={{ title: 'Profile' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      
      {/* Role-specific tabs */}
      <Tabs.Screen
        name="care-card"
        options={{
          title: 'Care Card',
          href: isPatient ? undefined : null, // Hide for providers
        }}
      />
      
      <Tabs.Screen
        name="provider"
        options={{
          title: 'Provider',
          href: isProvider ? undefined : null, // Hide for patients
        }}
      />
    </Tabs>
  );
}
```

### 2. Stack Navigation for Nested Screens

When a tab needs multiple screens, create a stack navigator:

```typescript
// app/(tabs)/provider/_layout.tsx
import { Stack } from 'expo-router';

export default function ProviderStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />           {/* Provider dashboard */}
      <Stack.Screen name="manage-patients" /> {/* Patient management */}
      <Stack.Screen name="patient-symptoms" />{/* Patient details */}
    </Stack>
  );
}
```

### 3. Role-Based Screen Protection

Use the `RoleGuard` component to protect screens:

```typescript
// app/(tabs)/provider/manage-patients.tsx
import { RoleGuard } from '@/components/RoleGuard';

function ManagePatientsContent() {
  // Screen implementation
}

export default function ManagePatientsScreen() {
  return (
    <RoleGuard 
      allowedRoles={['provider']} 
      fallbackMessage="Patient management is exclusively for healthcare providers."
    >
      <ManagePatientsContent />
    </RoleGuard>
  );
}
```

## Adding New Navigation Features

### Scenario 1: Adding a Simple Tab Screen

**Example**: Adding a "Reports" tab for providers

1. **Create the screen file**:
   ```
   app/(tabs)/reports.tsx
   ```

2. **Add to tab layout**:
   ```typescript
   // In app/(tabs)/_layout.tsx
   <Tabs.Screen
     name="reports"
     options={{
       title: 'Reports',
       tabBarIcon: ({ size, color }) => (
         <FileText size={size} color={color} strokeWidth={2} />
       ),
       href: isProvider ? undefined : null, // Provider only
     }}
   />
   ```

3. **Implement role protection**:
   ```typescript
   // In app/(tabs)/reports.tsx
   export default function ReportsScreen() {
     return (
       <RoleGuard allowedRoles={['provider']}>
         <ReportsContent />
       </RoleGuard>
     );
   }
   ```

### Scenario 2: Adding Nested Screens to Existing Tab

**Example**: Adding a "Settings" screen to the Profile tab

1. **Convert single screen to stack**:
   ```
   app/(tabs)/
   ├── profile/
   │   ├── _layout.tsx      # New stack navigator
   │   ├── index.tsx        # Move existing profile.tsx here
   │   └── settings.tsx     # New settings screen
   ```

2. **Create stack layout**:
   ```typescript
   // app/(tabs)/profile/_layout.tsx
   import { Stack } from 'expo-router';

   export default function ProfileStackLayout() {
     return (
       <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="index" />
         <Stack.Screen name="settings" />
       </Stack>
     );
   }
   ```

3. **Update tab configuration**:
   ```typescript
   // In app/(tabs)/_layout.tsx
   <Tabs.Screen
     name="profile"  // Now points to the stack
     options={{
       title: 'Profile',
       // ... other options
     }}
   />
   ```

### Scenario 3: Adding a New Role-Specific Section

**Example**: Adding an "Admin" section for administrators

1. **Create the stack structure**:
   ```
   app/(tabs)/
   └── admin/
       ├── _layout.tsx
       ├── index.tsx
       ├── user-management.tsx
       └── system-settings.tsx
   ```

2. **Add to tab layout with role check**:
   ```typescript
   // In app/(tabs)/_layout.tsx
   const isAdmin = userProfile?.role === 'admin';

   <Tabs.Screen
     name="admin"
     options={{
       title: 'Admin',
       tabBarIcon: ({ size, color }) => (
         <Settings size={size} color={color} strokeWidth={2} />
       ),
       href: isAdmin ? undefined : null,
     }}
   />
   ```

3. **Implement role protection**:
   ```typescript
   // In each admin screen
   export default function AdminScreen() {
     return (
       <RoleGuard allowedRoles={['admin']}>
         <AdminContent />
       </RoleGuard>
     );
   }
   ```

## Navigation Best Practices

### 1. Consistent File Naming

- **Tab screens**: Use descriptive names (`care-card.tsx`, `health-metrics.tsx`)
- **Stack screens**: Use action-oriented names (`manage-patients.tsx`, `patient-symptoms.tsx`)
- **Index files**: Always use `index.tsx` for default screens in directories

### 2. Role-Based Design

- **Always consider user roles** when designing navigation
- **Use the `RoleGuard` component** for screen-level protection
- **Hide irrelevant tabs** using the `href: null` pattern
- **Provide meaningful fallback messages** for unauthorized access

### 3. Responsive Considerations

- **Test navigation on different screen sizes** (mobile, tablet, desktop)
- **Adjust icon sizes and spacing** for larger screens
- **Consider different interaction patterns** (touch vs. mouse)

### 4. Performance Optimization

- **Lazy load screens** that aren't immediately needed
- **Use conditional rendering** for role-based features
- **Minimize re-renders** in navigation components

### 5. User Experience Guidelines

- **Keep navigation predictable** - don't move tabs around based on context
- **Provide clear visual feedback** for active tabs and navigation states
- **Use appropriate icons** that clearly represent each section
- **Maintain consistent styling** across all navigation elements

## Common Pitfalls and Solutions

### Problem 1: Nested Screens Appearing as Tabs

**Symptom**: Screens like `manage-patients` appear as separate tabs with down arrows

**Cause**: Screens are placed directly in `(tabs)/` instead of being nested in a stack

**Solution**: Create a stack navigator for the parent tab:
```
❌ Wrong:
app/(tabs)/
├── provider.tsx
├── manage-patients.tsx    # This becomes a tab!

✅ Correct:
app/(tabs)/
└── provider/
    ├── _layout.tsx        # Stack navigator
    ├── index.tsx          # Provider dashboard
    └── manage-patients.tsx # Nested screen
```

### Problem 2: Role-Based Navigation Not Working

**Symptom**: Users see tabs they shouldn't have access to

**Cause**: Missing or incorrect role checks in tab configuration

**Solution**: Always use proper role checks:
```typescript
// Check user role and hide inappropriate tabs
<Tabs.Screen
  name="provider"
  options={{
    href: isProvider ? undefined : null, // Critical: null hides the tab
  }}
/>
```

### Problem 3: Navigation State Issues

**Symptom**: Navigation doesn't update when user role changes

**Cause**: Tab layout not re-rendering when user context changes

**Solution**: Ensure proper dependency on user context:
```typescript
const { userProfile, isLoading } = useUser(); // This triggers re-render

if (isLoading) {
  return <LoadingScreen />; // Show loading while user data loads
}
```

### Problem 4: Deep Linking Issues

**Symptom**: Direct links to nested screens don't work properly

**Cause**: Incorrect stack configuration or missing screen definitions

**Solution**: Ensure all screens are properly defined in their stack:
```typescript
// In stack _layout.tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="manage-patients" />  // Must be defined
  <Stack.Screen name="patient-symptoms" /> // Must be defined
</Stack>
```

## Testing Navigation Changes

### 1. Role-Based Testing

Test navigation with different user roles:

```typescript
// Test scenarios:
// 1. Patient user - should only see patient tabs
// 2. Provider user - should only see provider tabs  
// 3. Admin user - should see admin tabs (if implemented)
// 4. Unauthenticated user - should see login screen
```

### 2. Screen Size Testing

Test on different screen sizes:
- Mobile (320px - 768px)
- Tablet (768px - 1024px)  
- Desktop (1024px+)

### 3. Navigation Flow Testing

Test complete user journeys:
- Login → Profile → Navigate to role-specific features
- Deep linking to nested screens
- Back navigation within stacks
- Tab switching behavior

## Migration Guidelines

### When Refactoring Navigation

1. **Plan the new structure** before making changes
2. **Create new files** before removing old ones
3. **Test thoroughly** with different user roles
4. **Update any hardcoded navigation references**
5. **Check deep linking** still works correctly

### Breaking Changes Checklist

When making navigation changes that might break existing functionality:

- [ ] All user roles tested
- [ ] Deep links still work
- [ ] Back navigation functions correctly
- [ ] Tab visibility rules work properly
- [ ] Screen protection (RoleGuard) is in place
- [ ] Responsive design maintained
- [ ] No orphaned screens or broken references

## Future Considerations

### Scalability

As the app grows, consider:

- **Grouping related tabs** into sections
- **Using drawer navigation** for secondary features
- **Implementing tab overflow** for many tabs
- **Adding search functionality** for large feature sets

### Advanced Features

Future navigation enhancements might include:

- **Dynamic tab ordering** based on user preferences
- **Contextual navigation** that changes based on current task
- **Breadcrumb navigation** for complex hierarchies
- **Quick actions** accessible from any screen

## Conclusion

The Care Card navigation system is designed to be:

- **Role-aware**: Shows appropriate features for each user type
- **Hierarchical**: Uses tabs for main sections, stacks for detailed flows
- **Scalable**: Easy to add new features without breaking existing patterns
- **Consistent**: Follows predictable patterns throughout the app

By following these patterns and guidelines, you can confidently add new navigation features while maintaining the app's usability and architectural integrity.

### Key Takeaways

1. **Always use stack navigators** for tabs that need multiple screens
2. **Implement proper role-based visibility** using `href: null` pattern
3. **Protect screens with RoleGuard** for security
4. **Test with all user roles** and screen sizes
5. **Follow consistent file naming** and organization patterns
6. **Plan navigation changes** before implementing them

This navigation design ensures that the Care Card application remains intuitive, secure, and maintainable as it continues to evolve and grow.