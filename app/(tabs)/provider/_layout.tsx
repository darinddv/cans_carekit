import { Stack } from 'expo-router';

export default function ProviderStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The index.tsx file will be the default screen for this stack */}
      <Stack.Screen name="index" />
      {/* Other screens within the provider group */}
      <Stack.Screen name="manage-patients" />
      <Stack.Screen name="patient-symptoms" />
    </Stack>
  );
}