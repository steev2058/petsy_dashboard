import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'appointment' | 'lost_pet' | 'message' | 'order' | 'general';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        console.log('Push notifications not supported on web');
        return null;
      }

      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;
      console.log('Push token:', this.expoPushToken);

      // Configure for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B4A',
        });

        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Appointments',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });

        await Notifications.setNotificationChannelAsync('lost_pets', {
          name: 'Lost Pets',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#EF4444',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250],
          lightColor: '#10B981',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async scheduleLocalNotification(notification: NotificationData, trigger?: Notifications.NotificationTriggerInput): Promise<string | null> {
    try {
      const channelId = this.getChannelId(notification.type);
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            type: notification.type,
            ...notification.data,
          },
          sound: 'default',
        },
        trigger: trigger || null,
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async sendImmediateNotification(notification: NotificationData): Promise<string | null> {
    return this.scheduleLocalNotification(notification, null);
  }

  async scheduleAppointmentReminder(
    appointmentId: string,
    vetName: string,
    date: string,
    time: string,
    reminderMinutes: number = 60
  ): Promise<string | null> {
    const appointmentDate = new Date(`${date} ${time}`);
    const reminderDate = new Date(appointmentDate.getTime() - reminderMinutes * 60 * 1000);

    if (reminderDate <= new Date()) {
      // Appointment is in the past or too soon
      return null;
    }

    return this.scheduleLocalNotification(
      {
        type: 'appointment',
        title: '📌 Appointment Reminder',
        body: `Your appointment with ${vetName} is in ${reminderMinutes} minutes`,
        data: { appointmentId },
      },
      { date: reminderDate }
    );
  }

  async notifyLostPetInArea(petName: string, species: string, location: string): Promise<string | null> {
    return this.sendImmediateNotification({
      type: 'lost_pet',
      title: '😱 Lost Pet Alert!',
      body: `A ${species} named ${petName} was lost near ${location}. Help find them!`,
      data: { petName, species, location },
    });
  }

  async notifyNewMessage(senderName: string, preview: string, conversationId: string): Promise<string | null> {
    return this.sendImmediateNotification({
      type: 'message',
      title: `💬 ${senderName}`,
      body: preview.length > 50 ? preview.substring(0, 50) + '...' : preview,
      data: { conversationId },
    });
  }

  async notifyOrderStatus(orderId: string, status: string): Promise<string | null> {
    const statusMessages: Record<string, string> = {
      confirmed: 'Your order has been confirmed!',
      shipped: 'Your order is on its way!',
      delivered: 'Your order has been delivered!',
    };

    return this.sendImmediateNotification({
      type: 'order',
      title: '📦 Order Update',
      body: statusMessages[status] || `Order status: ${status}`,
      data: { orderId, status },
    });
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  private getChannelId(type: string): string {
    const channels: Record<string, string> = {
      appointment: 'appointments',
      lost_pet: 'lost_pets',
      message: 'messages',
      order: 'default',
      general: 'default',
    };
    return channels[type] || 'default';
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
