import React from 'react';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
// IMPORTANT: explicit extension to avoid platform file recursion.
import { DocumentsScreen as DocumentsScreenBase } from './DocumentsScreen.tsx';

export function DocumentsScreen({ navigation }: any) {
  return (
    <WebSidebarLayout navigation={navigation} active="documents">
      <DocumentsScreenBase navigation={navigation} />
    </WebSidebarLayout>
  );
}

