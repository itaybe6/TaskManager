import React from 'react';
import { Platform } from 'react-native';
import { ClientDetailsScreen as ClientDetailsScreenWeb } from './ClientDetailsScreen.web';
import { ClientDetailsScreenMobile } from './ClientDetailsScreen.mobile';

export function ClientDetailsScreen(props: any) {
  if (Platform.OS === 'web') {
    return <ClientDetailsScreenWeb {...props} />;
  }
  return <ClientDetailsScreenMobile {...props} />;
}
