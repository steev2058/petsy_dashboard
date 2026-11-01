import { Redirect } from 'expo-router';

/** Tab entry that opens the shared messages inbox */
export default function MessagesTab() {
  return <Redirect href="/messages" />;
}
