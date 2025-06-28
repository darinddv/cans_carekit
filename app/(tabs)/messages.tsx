import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  RefreshControl,
  Alert,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { 
  MessageCircle, 
  Search, 
  Send, 
  User, 
  Clock, 
  Check, 
  CheckCheck,
  ArrowLeft,
  Plus,
  Mail,
  Heart,
  Briefcase
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  MessagingService, 
  Conversation, 
  MessageWithSender, 
  Message 
} from '@/lib/messagingService';
import { SupabaseService, UserProfile } from '@/lib/supabaseService';
import { useUser } from '@/contexts/UserContext';

export default function MessagesScreen() {
  const { conversationWith } = useLocalSearchParams();
  const { userProfile } = useUser();
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const scrollViewRef = useRef<ScrollView>(null);
  
  // State for conversations list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  
  // State for individual conversation
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  // State for new conversation
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // General state
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationWith && typeof conversationWith === 'string') {
      openConversationById(conversationWith);
    }
  }, [conversationWith]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      setError(null);
      
      // DEBUG: Log current user profile ID
      console.log('🔍 [DEBUG] Current user profile ID:', userProfile?.id);
      console.log('🔍 [DEBUG] Current user email:', userProfile?.email);
      console.log('🔍 [DEBUG] Current user role:', userProfile?.role);
      
      const conversationsList = await MessagingService.getConversations();
      setConversations(conversationsList);
      
      // DEBUG: Log conversations loaded
      console.log('🔍 [DEBUG] Conversations loaded:', conversationsList.length);
      conversationsList.forEach((conv, index) => {
        console.log(`🔍 [DEBUG] Conversation ${index}:`, {
          participantId: conv.participant.id,
          participantEmail: conv.participant.email,
          lastMessageId: conv.lastMessage?.id,
          lastMessageSender: conv.lastMessage?.sender_id,
          lastMessageReceiver: conv.lastMessage?.receiver_id,
          unreadCount: conv.unreadCount,
        });
      });
    } catch (err: any) {
      console.error('❌ [ERROR] Loading conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const openConversationById = async (userId: string) => {
    try {
      console.log('🔍 [DEBUG] Opening conversation with user ID:', userId);
      
      // Find existing conversation or create a new one
      let conversation = conversations.find(c => c.participant.id === userId);
      
      if (!conversation) {
        console.log('🔍 [DEBUG] Conversation not found in list, fetching user profile...');
        // Fetch user profile for new conversation
        const userProfile = await SupabaseService.fetchUserProfile(userId);
        if (userProfile) {
          console.log('🔍 [DEBUG] User profile fetched:', {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
          });
          conversation = {
            participant: userProfile,
            lastMessage: null,
            unreadCount: 0,
          };
        } else {
          console.log('❌ [ERROR] User profile not found for ID:', userId);
        }
      }
      
      if (conversation) {
        openConversation(conversation);
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Opening conversation:', err);
      setError(err.message || 'Failed to open conversation');
    }
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      console.log('🔍 [DEBUG] Opening conversation with:', {
        participantId: conversation.participant.id,
        participantEmail: conversation.participant.email,
        currentUserId: userProfile?.id,
      });
      
      setSelectedConversation(conversation);
      setIsLoadingMessages(true);
      setError(null);
      
      const conversationMessages = await MessagingService.getConversation(conversation.participant.id);
      setMessages(conversationMessages);
      
      // DEBUG: Log messages loaded
      console.log('🔍 [DEBUG] Messages loaded for conversation:', conversationMessages.length);
      conversationMessages.forEach((msg, index) => {
        console.log(`🔍 [DEBUG] Message ${index}:`, {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          content: msg.content.substring(0, 50) + '...',
          createdAt: msg.created_at,
          readAt: msg.read_at,
          senderEmail: msg.sender?.email,
        });
      });
      
      // Mark messages as read
      if (conversation.unreadCount > 0) {
        console.log('🔍 [DEBUG] Marking messages as read from:', conversation.participant.id);
        await MessagingService.markMessagesAsRead(conversation.participant.id);
        // Refresh conversations to update unread count
        loadConversations();
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Loading conversation:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    
    try {
      setIsSending(true);
      
      console.log('🔍 [DEBUG] Sending message:', {
        to: selectedConversation.participant.id,
        from: userProfile?.id,
        content: newMessage.trim().substring(0, 50) + '...',
      });
      
      const message = await MessagingService.sendMessage(
        selectedConversation.participant.id,
        newMessage.trim()
      );
      
      console.log('🔍 [DEBUG] Message sent successfully:', {
        messageId: message.id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
      });
      
      // Add message to local state with sender info
      const messageWithSender: MessageWithSender = {
        ...message,
        sender: {
          id: userProfile?.id || '',
          email: userProfile?.email || '',
          full_name: userProfile?.full_name,
          username: userProfile?.username,
          avatar_url: userProfile?.avatar_url,
        },
      };
      
      setMessages(prev => [...prev, messageWithSender]);
      setNewMessage('');
      
      // Refresh conversations to update last message
      loadConversations();
    } catch (err: any) {
      console.error('❌ [ERROR] Sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 [DEBUG] Searching users with query:', query);
      
      const results = await SupabaseService.searchUsersByEmail(query);
      
      console.log('🔍 [DEBUG] Search results:', results.length);
      results.forEach((user, index) => {
        console.log(`🔍 [DEBUG] Search result ${index}:`, {
          id: user.id,
          email: user.email,
          role: user.role,
        });
      });
      
      // Filter out current user and existing conversations
      const existingUserIds = conversations.map(c => c.participant.id);
      const filteredResults = results.filter(
        user => user.id !== userProfile?.id && !existingUserIds.includes(user.id)
      );
      
      console.log('🔍 [DEBUG] Filtered search results:', filteredResults.length);
      setSearchResults(filteredResults);
    } catch (err: any) {
      console.error('❌ [ERROR] Searching users:', err);
      setError(err.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const startNewConversation = (user: UserProfile) => {
    console.log('🔍 [DEBUG] Starting new conversation with:', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    });
    
    const newConversation: Conversation = {
      participant: user,
      lastMessage: null,
      unreadCount: 0,
    };
    
    setSelectedConversation(newConversation);
    setMessages([]);
    setShowNewConversation(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('🔍 [DEBUG] Refreshing conversations and messages...');
      await loadConversations();
      if (selectedConversation) {
        const conversationMessages = await MessagingService.getConversation(selectedConversation.participant.id);
        setMessages(conversationMessages);
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Refreshing:', err);
      setError(err.message || 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedConversation]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d`;
    return date.toLocaleDateString();
  };

  const getDisplayName = (user: { full_name?: string; username?: string; email: string }) => {
    return user.full_name || user.username || user.email.split('@')[0];
  };

  const renderAvatar = (user: { avatar_url?: string }, size: number = 40) => {
    if (user.avatar_url) {
      return (
        <Image
          source={{ uri: user.avatar_url }}
          style={[
            styles.avatarImage,
            { width: size, height: size, borderRadius: size / 2 }
          ]}
          defaultSource={require('../../assets/images/icon.png')}
        />
      );
    }
    
    return (
      <View style={[
        styles.avatarFallback,
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: '#F0F9FF',
          borderWidth: 2,
          borderColor: '#007AFF',
        }
      ]}>
        <User size={size * 0.5} color="#007AFF" strokeWidth={2} />
      </View>
    );
  };

  const getRoleIcon = (role?: string) => {
    if (role === 'provider') {
      return <Briefcase size={12} color="#007AFF" strokeWidth={2} />;
    }
    return <Heart size={12} color="#FF69B4" strokeWidth={2} />;
  };

  const isWeb = Platform.OS === 'web';
  const isTablet = windowDimensions.width >= 768;
  const isDesktop = windowDimensions.width >= 1024;
  const isLargeDesktop = windowDimensions.width >= 1440;

  const getResponsiveStyles = () => {
    const baseStyles = styles;
    
    if (isWeb && isDesktop) {
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          backgroundColor: '#F8F9FA',
        },
        content: {
          ...baseStyles.content,
          maxWidth: isLargeDesktop ? 1200 : 1000,
          alignSelf: 'center',
          paddingHorizontal: isLargeDesktop ? 40 : 32,
          paddingTop: isLargeDesktop ? 48 : 40,
        },
        title: {
          ...baseStyles.title,
          fontSize: isLargeDesktop ? 40 : 36,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: isLargeDesktop ? 18 : 16,
        },
      };
    } else if (isWeb && isTablet) {
      return {
        ...baseStyles,
        content: {
          ...baseStyles.content,
          maxWidth: 800,
          alignSelf: 'center',
          paddingHorizontal: 32,
        },
        title: {
          ...baseStyles.title,
          fontSize: 36,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: 18,
        },
      };
    }
    
    return baseStyles;
  };

  const responsiveStyles = getResponsiveStyles();

  // Show conversation view if a conversation is selected
  if (selectedConversation) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.conversationHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedConversation(null)}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.conversationInfo}>
              {renderAvatar(selectedConversation.participant, 44)}
              <View style={styles.participantDetails}>
                <View style={styles.participantNameRow}>
                  <Text style={styles.participantName}>
                    {getDisplayName(selectedConversation.participant)}
                  </Text>
                  {getRoleIcon(selectedConversation.participant.role)}
                </View>
                <Text style={styles.participantEmail}>
                  {selectedConversation.participant.email}
                </Text>
              </View>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {isLoadingMessages ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <View style={styles.emptyMessagesIcon}>
                  <MessageCircle size={56} color="#007AFF" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyMessagesTitle}>Start the conversation</Text>
                <Text style={styles.emptyMessagesSubtitle}>
                  Send a message to begin chatting with {getDisplayName(selectedConversation.participant)}
                </Text>
              </View>
            ) : (
              messages.map((message, index) => {
                const isCurrentUser = message.sender_id === userProfile?.id;
                const showAvatar = !isCurrentUser && (
                  index === 0 || 
                  messages[index - 1]?.sender_id !== message.sender_id
                );
                
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageContainer,
                      isCurrentUser ? styles.sentMessage : styles.receivedMessage,
                    ]}
                  >
                    {showAvatar && (
                      <View style={styles.messageAvatar}>
                        {renderAvatar(message.sender, 32)}
                      </View>
                    )}
                    <View style={[
                      styles.messageBubble,
                      isCurrentUser ? styles.sentBubble : styles.receivedBubble,
                      !showAvatar && !isCurrentUser && styles.messageBubbleNoAvatar,
                    ]}>
                      <Text style={[
                        styles.messageText,
                        isCurrentUser ? styles.sentMessageText : styles.receivedMessageText,
                      ]}>
                        {message.content}
                      </Text>
                      <View style={styles.messageFooter}>
                        <Text style={[
                          styles.messageTime,
                          isCurrentUser ? styles.sentMessageTime : styles.receivedMessageTime,
                        ]}>
                          {formatTime(message.created_at)}
                        </Text>
                        {isCurrentUser && (
                          <View style={styles.messageStatus}>
                            {message.read_at ? (
                              <CheckCheck size={14} color="rgba(255, 255, 255, 0.8)" strokeWidth={2} />
                            ) : (
                              <Check size={14} color="rgba(255, 255, 255, 0.6)" strokeWidth={2} />
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.messageInputContainer}>
            <View style={styles.messageInputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="#8E8E93"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={1000}
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || isSending}
                activeOpacity={0.7}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Show new conversation modal
  if (showNewConversation) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.newConversationHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowNewConversation(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.newConversationTitle}>New Message</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#8E8E93" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email address"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
          </View>
        </View>

        <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
          {searchResults.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userResultItem}
              onPress={() => startNewConversation(user)}
              activeOpacity={0.7}
            >
              {renderAvatar(user, 48)}
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>
                    {getDisplayName(user)}
                  </Text>
                  {getRoleIcon(user.role)}
                </View>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={[
                  styles.userRole,
                  { color: user.role === 'provider' ? '#007AFF' : '#FF69B4' }
                ]}>
                  {user.role === 'provider' ? 'Healthcare Provider' : 'Patient'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <View style={styles.noResultsIcon}>
                <Mail size={56} color="#8E8E93" strokeWidth={1.5} />
              </View>
              <Text style={styles.noResultsTitle}>No users found</Text>
              <Text style={styles.noResultsSubtitle}>
                Try searching with a different email address
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show conversations list
  return (
    <SafeAreaView style={responsiveStyles.container}>
      <ScrollView 
        contentContainerStyle={responsiveStyles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <MessageCircle size={32} color="#007AFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={responsiveStyles.title}>Messages</Text>
                <Text style={responsiveStyles.subtitle}>
                  Secure communication with your care team
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.newMessageButton}
              onPress={() => setShowNewConversation(true)}
              activeOpacity={0.7}
            >
              <Plus size={24} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Conversations List */}
        {isLoadingConversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <MessageCircle size={72} color="#007AFF" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start a conversation with your healthcare provider or patients to begin secure messaging
            </Text>
            <TouchableOpacity
              style={styles.startConversationButton}
              onPress={() => setShowNewConversation(true)}
              activeOpacity={0.7}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.startConversationButtonText}>Start Conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.conversationsList}>
            {conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.participant.id}
                style={styles.conversationItem}
                onPress={() => openConversation(conversation)}
                activeOpacity={0.7}
              >
                {renderAvatar(conversation.participant, 56)}
                
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <View style={styles.conversationNameRow}>
                      <Text style={styles.conversationName}>
                        {getDisplayName(conversation.participant)}
                      </Text>
                      {getRoleIcon(conversation.participant.role)}
                    </View>
                    {conversation.lastMessage && (
                      <Text style={styles.conversationTime}>
                        {formatTime(conversation.lastMessage.created_at)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.conversationFooter}>
                    <Text style={styles.conversationPreview} numberOfLines={2}>
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
    lineHeight: 20,
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#007AFF',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
    fontWeight: '500',
  },
  newMessageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#007AFF',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '500',
  },
  startConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  startConversationButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  conversationsList: {
    gap: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 16,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conversationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 6,
  },
  conversationTime: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  conversationPreview: {
    fontSize: 15,
    color: '#8E8E93',
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Avatar styles
  avatarImage: {
    resizeMode: 'cover',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Conversation view styles
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    marginRight: 16,
  },
  conversationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantDetails: {
    marginLeft: 12,
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },
  participantEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    padding: 20,
    gap: 12,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyMessagesIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  emptyMessagesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessagesSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  messageBubbleNoAvatar: {
    marginLeft: 40,
  },
  sentBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 8,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  sentMessageText: {
    color: '#FFFFFF',
  },
  receivedMessageText: {
    color: '#1C1C1E',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  receivedMessageTime: {
    color: '#8E8E93',
  },
  messageStatus: {
    marginLeft: 6,
  },
  messageInputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 2,
  },
  messageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
    maxHeight: 120,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0,
  },
  // New conversation styles
  newConversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  newConversationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 16,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
    fontWeight: '500',
  },
  searchResults: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },
  userEmail: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  userRole: {
    fontSize: 13,
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  noResultsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  noResultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});