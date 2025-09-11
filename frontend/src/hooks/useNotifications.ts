import { useState, useEffect, useCallback } from 'react';
import { collaborationAPI } from '../services/api';

interface NotificationCounts {
  pendingSuggestions: number;
  pendingInvitations: number;
  recentApprovals: number;
  recentRejections: number;
  total: number;
}

interface PendingSuggestion {
  id: number;
  journey_id: number;
  journey_title: string;
  title: string;
  description: string;
  suggested_by_name: string;
  created_at: string;
}

interface RecentResponse {
  id: number;
  journey_id: number;
  journey_title: string;
  title: string;
  status: 'approved' | 'rejected';
  responded_at: string;
}

interface Invitation {
  id: number;
  journey_id: number;
  journey_title: string;
  invited_by_name: string;
  created_at: string;
  message?: string;
}

// Global state to ensure only one polling instance runs
let globalPollingInterval: NodeJS.Timeout | null = null;
let globalListeners: Set<() => void> = new Set();

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationCounts>({
    pendingSuggestions: 0,
    pendingInvitations: 0,
    recentApprovals: 0,
    recentRejections: 0,
    total: 0
  });
  const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await collaborationAPI.getNotifications();
      const data = response.data;
      
      // Update all listeners
      globalListeners.forEach(listener => listener());
      
      return data;
    } catch (error) {
      console.error('Failed to load notifications:', error);
      return null;
    }
  }, []);

  const refreshNotificationDetails = useCallback(async () => {
    try {
      const response = await collaborationAPI.getNotificationDetails();
      const data = response.data;
      
      // Update all listeners
      globalListeners.forEach(listener => listener());
      
      return data;
    } catch (error) {
      console.error('Failed to load notification details:', error);
      return null;
    }
  }, []);

  const refreshPendingInvitations = useCallback(async () => {
    try {
      const response = await collaborationAPI.getPendingInvitations();
      const data = response.data.invitations || [];
      
      // Update all listeners
      globalListeners.forEach(listener => listener());
      
      return data;
    } catch (error) {
      console.error('Failed to load pending invitations:', error);
      return [];
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    const [notificationData, detailData, invitationData] = await Promise.all([
      refreshNotifications(),
      refreshNotificationDetails(),
      refreshPendingInvitations()
    ]);

    if (notificationData) setNotifications(notificationData);
    if (detailData) {
      setPendingSuggestions(detailData.pendingSuggestions || []);
      setRecentResponses(detailData.recentResponses || []);
    }
    if (invitationData) setInvitations(invitationData);
  }, [refreshNotifications, refreshNotificationDetails, refreshPendingInvitations]);

  useEffect(() => {
    // Add this component to the global listeners
    const updateListener = () => refreshAllData();
    globalListeners.add(updateListener);

    // Initial load
    refreshAllData();

    // Start global polling if not already running
    if (!globalPollingInterval) {
      console.log('Starting global notification polling every 5 minutes');
      globalPollingInterval = setInterval(async () => {
        await refreshAllData();
      }, 300000); // 5 minutes
    }

    // Listen for manual refresh events
    const handleRefreshNotifications = () => {
      refreshAllData();
    };
    
    window.addEventListener('refreshNotifications', handleRefreshNotifications);

    return () => {
      // Remove this component from listeners
      globalListeners.delete(updateListener);
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);

      // Clear global polling if no more listeners
      if (globalListeners.size === 0 && globalPollingInterval) {
        console.log('Stopping global notification polling - no more listeners');
        clearInterval(globalPollingInterval);
        globalPollingInterval = null;
      }
    };
  }, [refreshAllData]);

  const triggerRefresh = useCallback(() => {
    window.dispatchEvent(new Event('refreshNotifications'));
  }, []);

  return {
    notifications,
    pendingSuggestions,
    recentResponses,
    invitations,
    refreshNotifications: refreshAllData,
    triggerRefresh
  };
};
