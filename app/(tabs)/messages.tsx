import React, { useState, useEffect, useCallback } from 'react';
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
  Mail
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

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      setError(null);
      
      const conversationsList = await MessagingService.getConversations();
      setConversations(conversationsList);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const openConversationById = async (userId: string) => {
    try {
      // Find existing conversation or create a new one
      let conversation = conversations.find(c => c.participant.id === userId);
      
      if (!conversation) {
        // Fetch user profile for new conversation
        const userProfile = await SupabaseService.fetchUserProfile(userId);
        if (userProfile) {
          conversation = {
            participant: userProfile,
            lastMessage: null,
            unreadCount: 0,
          };
        }
      }
      
      if (conversation) {
        openConversation(conversation);
      }
    } catch (err: any) {
      console.error('Error opening conversation:', err);
      setError(err.message || 'Failed to open conversation');
    }
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      setSelectedConversation(conversation);
      setIsLoadingMessages(true);
      setError(null);
      
      const conversationMessages = await MessagingService.getConversation(conversation.participant.id);
      setMessages(conversationMessages);
      
      // Mark messages as read
      if (conversation.unreadCount > 0) {
        await MessagingService.markMessagesAsRead(conversation.participant.id);
        // Refresh conversations to update unread count
        loadConversations();
      }
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    
    try {
      setIsSending(true);
      
      const message = await MessagingService.sendMessage(
        selectedConversation.participant.id,
        newMessage.trim()
      );
      
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
      console.error('Error sending message:', err);
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
      const results = await SupabaseService.searchUsersByEmail(query);
      
      // Filter out current user and existing conversations
      const existingUserIds = conversations.map(c => c.participant.id);
      const filteredResults = results.filter(
        user => user.id !== userProfile?.id && !existingUserIds.includes(user.id)
      );
      
      setSearchResults(filteredResults);
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError(err.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const startNewConversation = (user: UserProfile) => {
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
      await loadConversations();
      if (selectedConversation) {
        const conversationMessages = await MessagingService.getConversation(selectedConversation.participant.id);
        setMessages(conversationMessages);
      }
    } catch (err: any) {
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
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
        <View style={styles.conversationHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedConversation(null)}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.conversationInfo}>
            <View style={styles.participantAvatar}>
              <User size={20} color="#007AFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.participantName}>
                {selectedConversation.participant.full_name || 
                 selectedConversation.participant.username || 
                 selectedConversation.participant.email.split('@')[0]}
              </Text>
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
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <MessageCircle size={48} color="#8E8E93" strokeWidth={1.5} />
              <Text style={styles.emptyMessagesTitle}>Start the conversation</Text>
              <Text style={styles.emptyMessagesSubtitle}>
                Send a message to begin chatting with {selectedConversation.participant.full_name || selectedConversation.participant.email}
              </Text>
            </View>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.sender_id === userProfile?.id;
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.sentMessage : styles.receivedMessage,
                  ]}
                >
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
                          <CheckCheck size={14} color="#007AFF" strokeWidth={2} />
                        ) : (
                          <Check size={14} color="#8E8E93" strokeWidth={2} />
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
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
              <Send size={20} color="#FFFFFF" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
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
              <View style={styles.userAvatar}>
                <User size={20} color="#007AFF" strokeWidth={2} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.full_name || user.username || user.email.split('@')[0]}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userRole}>
                  {user.role === 'provider' ? 'Healthcare Provider' : 'Patient'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Mail size={48} color="#8E8E93" strokeWidth={1.5} />
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
              <MessageCircle size={64} color="#8E8E93" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start a conversation with your healthcare provider or patients
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
                <View style={styles.conversationAvatar}>
                  <User size={24} color="#007AFF" strokeWidth={2} />
                </View>
                
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>
                      {conversation.participant.full_name || 
                       conversation.participant.username || 
                       conversation.participant.email.split('@')[0]}
                    </Text>
                    {conversation.lastMessage && (
                      <Text style={styles.conversationTime}>
                        {formatTime(conversation.lastMessage.created_at)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.conversationFooter}>
                    <Text style={styles.conversationPreview} numberOfLines={1}>
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
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  },
  newMessageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  startConversationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  conversationsList: {
    gap: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    marginRight: 16,
  },
  conversationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyMessagesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessagesSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginVertical: 2,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
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
    fontSize: 11,
    fontWeight: '500',
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedMessageTime: {
    color: '#8E8E93',
  },
  messageStatus: {
    marginLeft: 4,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#8E8E93',
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
  },
  newConversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 16,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
  },
  searchResults: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});