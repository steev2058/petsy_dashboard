import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { conversationsAPI, getChatWebSocketUrl } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ConversationDetail {
  id: string;
  other_user?: {
    id: string;
    name: string;
    avatar?: string;
    is_online?: boolean;
  };
}

interface RealtimeEvent {
  type: string;
  conversation_id?: string;
  payload?: {
    message?: ChatMessage;
    [key: string]: any;
  };
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, isRTL } = useTranslation();
  const { user, isAuthenticated } = useStore();
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  // read receipts are tracked on each message via `is_read`
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthenticated && id) {
      loadMessages();
      connectRealtime();
    } else {
      setLoading(false);
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [id, isAuthenticated]);

  const connectRealtime = async () => {
    try {
      const wsUrl = await getChatWebSocketUrl();
      if (!wsUrl) return;

      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          if (data.type === 'new_message' && data.conversation_id === id) {
            const incoming = data.payload?.message;
            if (!incoming) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });

            // incoming from other user -> mark read + send read signal
            if (incoming.sender_id !== user?.id) {
              try {
                await conversationsAPI.markRead(id as string);
                ws.send(JSON.stringify({ type: 'read', conversation_id: id }));
              } catch {}
            }

            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          } else if (data.type === 'typing' && data.conversation_id === id) {
            const typingUserId = data.payload?.user_id;
            if (typingUserId && typingUserId !== user?.id) {
              setOtherTyping(!!data.payload?.is_typing);
            }
          } else if (data.type === 'messages_read' && data.conversation_id === id) {
            const readerId = data.payload?.reader_id;
            if (readerId && readerId !== user?.id) {
              setMessages((prev) => prev.map((m) => (m.sender_id === user?.id ? { ...m, is_read: true } : m)));
            }
          } else if (data.type === 'presence_update') {
            const pUserId = data.payload?.user_id;
            if (pUserId && pUserId === conversation?.other_user?.id) {
              setOtherOnline(!!data.payload?.is_online);
            }
          } else if (data.type === 'connected') {
            const onlineIds: string[] = (data as any)?.payload?.online_user_ids || [];
            if (conversation?.other_user?.id) {
              setOtherOnline(onlineIds.includes(conversation.other_user.id));
            }
          }
        } catch (e) {
          console.log('Realtime parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!isAuthenticated) return;
        reconnectTimerRef.current = setTimeout(() => {
          connectRealtime();
        }, 2000);
      };
    } catch (error) {
      console.error('Realtime connection error:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await conversationsAPI.getMessages(id as string);
      // API returns array directly or object with messages
      const messagesData = Array.isArray(response.data) ? response.data : (response.data.messages || []);
      setMessages(messagesData);
      if (!Array.isArray(response.data) && response.data.conversation) {
        setConversation(response.data.conversation);
        setOtherOnline(!!response.data.conversation?.other_user?.is_online);
      } else {
        setConversation({ id: id as string });
      }

      try {
        await conversationsAPI.markRead(id as string);
      } catch (e) {
        // non-blocking
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageContent = inputText.trim();
    setSending(true);
    // reset read receipt indicator for new outgoing messages
    
    // Optimistically add the message to the UI
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: id as string,
      sender_id: user?.id || '',
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    
    try {
      await conversationsAPI.sendMessage(id as string, messageContent);
      // Reload to get the real message with correct ID
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setInputText(messageContent);
    } finally {
      setSending(false);
    }
  };

  const onChangeInput = (text: string) => {
    setInputText(text);

    if (wsRef.current && id) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          conversation_id: id,
          is_typing: text.trim().length > 0,
        }));
      } catch {}
    }

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      if (wsRef.current && id) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'typing', conversation_id: id, is_typing: false }));
        } catch {}
      }
    }, 1200);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].sender_id !== item.sender_id);

    return (
      <View style={[
        styles.messageRow,
        isOwnMessage ? styles.messageRowOwn : styles.messageRowOther,
      ]}>
        {!isOwnMessage && showAvatar && (
          <View style={styles.avatarContainer}>
            {conversation?.other_user?.avatar ? (
              <Image
                source={{ uri: conversation.other_user.avatar }}
                style={styles.avatar}
              />
            ) : (
              <LinearGradient
                colors={[Colors.secondary, Colors.secondary + 'CC']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarInitial}>
                  {(conversation?.other_user?.name || 'U')[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
        )}
        {!isOwnMessage && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage && styles.messageTextOwn,
          ]}>
            {item.content}
          </Text>

          {isOwnMessage ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
              <Text style={[styles.messageTime, styles.messageTimeOwn]}>{formatTime(item.created_at)}</Text>
              <Ionicons
                name={item.is_read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.is_read ? Colors.primary : Colors.textLight}
              />
            </View>
          ) : (
            <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
          )}
        </View>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="chatbubbles" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to view messages</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>Login Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, Shadow.small]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerUser}>
          {conversation?.other_user?.avatar ? (
            <Image
              source={{ uri: conversation.other_user.avatar }}
              style={styles.headerAvatar}
            />
          ) : (
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.headerAvatarPlaceholder}
            >
              <Text style={styles.headerAvatarInitial}>
                {(conversation?.other_user?.name || 'U')[0].toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <View>
            <Text style={styles.headerName}>
              {conversation?.other_user?.name || 'User'}
            </Text>
            <View style={styles.onlineStatus}>
              <View style={[styles.onlineDot, !otherOnline && { backgroundColor: Colors.textLight }]} />
              <Text style={[styles.onlineText, !otherOnline && { color: Colors.textSecondary }]}>
                {otherTyping ? 'Typing…' : (otherOnline ? 'Online' : 'Offline')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={60} color={Colors.textLight} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.inputContainer, Shadow.medium]}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={28} color={Colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={onChangeInput}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? Colors.white : Colors.textLight}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  headerName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  avatarSpacer: {
    width: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadow.small,
  },
  messageText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: Colors.white,
  },
  messageTime: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyChatText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyChatSubtext: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  attachButton: {
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    maxHeight: 100,
    color: Colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.backgroundDark,
  },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
});
