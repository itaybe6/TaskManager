import React from 'react';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
// IMPORTANT: explicit extension to avoid platform file recursion.
import { NotificationsScreen as NotificationsScreenBase } from './NotificationsScreen.tsx';

export function NotificationsScreen({ navigation }: any) {
  return (
    <WebSidebarLayout navigation={navigation} active="notifications">
      <NotificationsScreenBase navigation={navigation} />
    </WebSidebarLayout>
  );
}
