import { NativeTabs } from 'expo-router/native-tabs';
import { useColors } from '../../lib/theme';

export default function TabsLayout() {
  const c = useColors();
  return (
    <NativeTabs tintColor={c.accent}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>Read</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf="sparkles" />
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Icon sf={{ default: 'flame', selected: 'flame.fill' }} />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
