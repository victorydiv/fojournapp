import { useQuery } from '@tanstack/react-query';
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

export const useNotifications = () => {
  // Query for basic notification counts
  const { data: notifications = {
    pendingSuggestions: 0,
    pendingInvitations: 0,
    recentApprovals: 0,
    recentRejections: 0,
    total: 0
  }, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await collaborationAPI.getNotifications();
      return response.data;
    },
    refetchInterval: 300000, // 5 minutes
    retry: 1,
    retryDelay: 30000, // 30 seconds between retries
    staleTime: 240000, // Consider data stale after 4 minutes
  });

  // Query for detailed notification data
  const { data: detailData } = useQuery({
    queryKey: ['notification-details'],
    queryFn: async () => {
      const response = await collaborationAPI.getNotificationDetails();
      return response.data;
    },
    refetchInterval: 300000, // 5 minutes
    retry: 1,
    retryDelay: 30000,
    staleTime: 240000,
  });

  // Query for pending invitations
  const { data: invitationData } = useQuery({
    queryKey: ['pending-invitations'],
    queryFn: async () => {
      const response = await collaborationAPI.getPendingInvitations();
      return response.data.invitations || [];
    },
    refetchInterval: 300000, // 5 minutes
    retry: 1,
    retryDelay: 30000,
    staleTime: 240000,
  });

  const pendingSuggestions: PendingSuggestion[] = detailData?.pendingSuggestions || [];
  const recentResponses: RecentResponse[] = detailData?.recentResponses || [];
  const invitations: Invitation[] = invitationData || [];

  return {
    notifications,
    pendingSuggestions,
    recentResponses,
    invitations,
    refreshNotifications: refetchNotifications,
    triggerRefresh: refetchNotifications
  };
};
