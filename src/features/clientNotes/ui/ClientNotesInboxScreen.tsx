import React from 'react';
import { Platform } from 'react-native';
import { ClientNotesInboxScreen as Web } from './ClientNotesInboxScreen.web';
import { ClientNotesInboxScreen as Native } from './ClientNotesInboxScreen.native';

export function ClientNotesInboxScreen({ navigation }: any) {
  if (Platform.OS === 'web') {
    return <Web navigation={navigation} />;
  }
  return <Native navigation={navigation} />;
}

