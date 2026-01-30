import React from 'react';
import { Platform } from 'react-native';
import { ClientDetailsScreen as ClientDetailsScreenWeb } from './ClientDetailsScreen.web';

export function ClientDetailsScreen(props: any) {
  if (Platform.OS === 'web') {
    return <ClientDetailsScreenWeb {...props} />;
  }
  // Fallback for mobile if needed, for now we can use the same or a placeholder
  return <ClientDetailsScreenWeb {...props} />;
}
