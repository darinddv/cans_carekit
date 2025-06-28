import { supabase, Database } from './supabase';

// Types for messaging
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

// Extended types for UI
export interface MessageWithSender extends Message {
  sender: {
    id: string;
    email: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  participant: {
    id: string;
    email: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
    role?: string;
  };
  lastMessage: Message | null;
  unreadCount: number;
}

export class MessagingService {
  // Send a new message
  static async sendMessage(receiverId: string, content: string): Promise<Message> {
    try {
      console.log('🔍 [DEBUG] MessagingService.sendMessage called:', {
        receiverId,
        contentLength: content.length,
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in sendMessage:', userError);
        throw new Error('User not authenticated');
      }

      console.log('🔍 [DEBUG] Authenticated user for sending:', {
        userId: user.id,
        userEmail: user.email,
      });

      const messageData: MessageInsert = {
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
      };

      console.log('🔍 [DEBUG] Message data to insert:', messageData);

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('❌ [ERROR] Send message database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('✅ [SUCCESS] Message sent successfully:', {
        messageId: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
      });
      return data;
    } catch (error) {
      console.error('❌ [ERROR] Send message exception:', error);
      throw error;
    }
  }

  // Get messages between current user and another user
  static async getConversation(otherUserId: string, limit: number = 50): Promise<MessageWithSender[]> {
    try {
      console.log('🔍 [DEBUG] MessagingService.getConversation called:', {
        otherUserId,
        limit,
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in getConversation:', userError);
        throw new Error('User not authenticated');
      }

      console.log('🔍 [DEBUG] Authenticated user for conversation:', {
        userId: user.id,
        userEmail: user.email,
      });

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            full_name,
            username,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ [ERROR] Get conversation database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('🔍 [DEBUG] Raw conversation data from database:', {
        messageCount: data?.length || 0,
        firstMessage: data?.[0] ? {
          id: data[0].id,
          senderId: data[0].sender_id,
          receiverId: data[0].receiver_id,
          senderData: data[0].sender,
        } : null,
      });

      // Log each message for debugging
      data?.forEach((message: any, index) => {
        console.log(`🔍 [DEBUG] Message ${index}:`, {
          id: message.id,
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          content: message.content.substring(0, 50) + '...',
          createdAt: message.created_at,
          readAt: message.read_at,
          senderInfo: message.sender ? {
            id: message.sender.id,
            email: message.sender.email,
            fullName: message.sender.full_name,
          } : 'NULL_SENDER',
        });
      });

      console.log('✅ [SUCCESS] Conversation loaded successfully:', data?.length || 0, 'messages');
      return data || [];
    } catch (error) {
      console.error('❌ [ERROR] Get conversation exception:', error);
      throw error;
    }
  }

  // Get all conversations for current user
  static async getConversations(): Promise<Conversation[]> {
    try {
      console.log('🔍 [DEBUG] MessagingService.getConversations called');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in getConversations:', userError);
        throw new Error('User not authenticated');
      }

      console.log('🔍 [DEBUG] Authenticated user for conversations:', {
        userId: user.id,
        userEmail: user.email,
      });

      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            full_name,
            username,
            avatar_url,
            role
          ),
          receiver:users!messages_receiver_id_fkey(
            id,
            email,
            full_name,
            username,
            avatar_url,
            role
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ERROR] Get conversations database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('🔍 [DEBUG] Raw messages data from database:', {
        messageCount: messages?.length || 0,
        currentUserId: user.id,
      });

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((message: any, index) => {
        console.log(`🔍 [DEBUG] Processing message ${index}:`, {
          messageId: message.id,
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          currentUserId: user.id,
          senderData: message.sender ? {
            id: message.sender.id,
            email: message.sender.email,
            role: message.sender.role,
          } : 'NULL_SENDER',
          receiverData: message.receiver ? {
            id: message.receiver.id,
            email: message.receiver.email,
            role: message.receiver.role,
          } : 'NULL_RECEIVER',
        });

        const isCurrentUserSender = message.sender_id === user.id;
        const participant = isCurrentUserSender ? message.receiver : message.sender;
        
        // Enhanced null check for participant with detailed logging
        if (!participant || !participant.id) {
          console.warn('⚠️ [WARNING] Skipping message with null/incomplete participant:', {
            messageId: message.id,
            senderId: message.sender_id,
            receiverId: message.receiver_id,
            isCurrentUserSender,
            participantData: participant,
            senderData: message.sender,
            receiverData: message.receiver,
            rawMessage: message,
          });
          return;
        }

        console.log(`🔍 [DEBUG] Valid participant found for message ${index}:`, {
          participantId: participant.id,
          participantEmail: participant.email,
          participantRole: participant.role,
          isCurrentUserSender,
        });

        if (!conversationMap.has(participant.id)) {
          console.log(`🔍 [DEBUG] Creating new conversation for participant:`, {
            participantId: participant.id,
            participantEmail: participant.email,
          });
          
          conversationMap.set(participant.id, {
            participant,
            lastMessage: message,
            unreadCount: 0,
          });
        }

        // Update last message if this one is more recent
        const existingConversation = conversationMap.get(participant.id)!;
        if (!existingConversation.lastMessage || 
            new Date(message.created_at) > new Date(existingConversation.lastMessage.created_at)) {
          console.log(`🔍 [DEBUG] Updating last message for conversation:`, {
            participantId: participant.id,
            newMessageId: message.id,
            newMessageDate: message.created_at,
          });
          existingConversation.lastMessage = message;
        }

        // Count unread messages (messages sent to current user that haven't been read)
        if (!isCurrentUserSender && !message.read_at) {
          existingConversation.unreadCount++;
          console.log(`🔍 [DEBUG] Incrementing unread count for participant:`, {
            participantId: participant.id,
            newUnreadCount: existingConversation.unreadCount,
            messageId: message.id,
          });
        }
      });

      const conversations = Array.from(conversationMap.values())
        .sort((a, b) => {
          if (!a.lastMessage || !b.lastMessage) return 0;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

      console.log('✅ [SUCCESS] Conversations processed successfully:', {
        totalConversations: conversations.length,
        conversationDetails: conversations.map(conv => ({
          participantId: conv.participant.id,
          participantEmail: conv.participant.email,
          participantRole: conv.participant.role,
          lastMessageId: conv.lastMessage?.id,
          unreadCount: conv.unreadCount,
        })),
      });

      return conversations;
    } catch (error) {
      console.error('❌ [ERROR] Get conversations exception:', error);
      throw error;
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(senderId: string): Promise<void> {
    try {
      console.log('🔍 [DEBUG] MessagingService.markMessagesAsRead called:', {
        senderId,
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in markMessagesAsRead:', userError);
        throw new Error('User not authenticated');
      }

      console.log('🔍 [DEBUG] Marking messages as read:', {
        currentUserId: user.id,
        senderId,
      });

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('❌ [ERROR] Mark messages as read database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('✅ [SUCCESS] Messages marked as read successfully');
    } catch (error) {
      console.error('❌ [ERROR] Mark messages as read exception:', error);
      throw error;
    }
  }

  // Delete a message (only sender can delete)
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      console.log('🔍 [DEBUG] MessagingService.deleteMessage called:', {
        messageId,
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in deleteMessage:', userError);
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) {
        console.error('❌ [ERROR] Delete message database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('✅ [SUCCESS] Message deleted successfully');
    } catch (error) {
      console.error('❌ [ERROR] Delete message exception:', error);
      throw error;
    }
  }

  // Subscribe to real-time message updates for a conversation
  static subscribeToConversation(
    otherUserId: string,
    callback: (message: Message) => void
  ): () => void {
    console.log('🔍 [DEBUG] Setting up real-time subscription for conversation with:', otherUserId);

    const subscription = supabase
      .channel(`conversation-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${otherUserId}`,
        },
        (payload) => {
          console.log('🔍 [DEBUG] New message received via real-time:', payload);
          callback(payload.new as Message);
        }
      )
      .subscribe((status) => {
        console.log('🔍 [DEBUG] Conversation subscription status:', status);
      });

    return () => {
      console.log('🔍 [DEBUG] Unsubscribing from conversation updates');
      subscription.unsubscribe();
    };
  }

  // Subscribe to real-time updates for all conversations
  static subscribeToAllConversations(
    callback: (message: Message) => void
  ): () => void {
    console.log('🔍 [DEBUG] Setting up real-time subscription for all conversations');

    const subscription = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('🔍 [DEBUG] Message update received via real-time:', payload);
          if (payload.eventType === 'INSERT') {
            callback(payload.new as Message);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔍 [DEBUG] All conversations subscription status:', status);
      });

    return () => {
      console.log('🔍 [DEBUG] Unsubscribing from all conversation updates');
      subscription.unsubscribe();
    };
  }

  // Get unread message count for current user
  static async getUnreadMessageCount(): Promise<number> {
    try {
      console.log('🔍 [DEBUG] MessagingService.getUnreadMessageCount called');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in getUnreadMessageCount:', userError);
        throw new Error('User not authenticated');
      }

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('❌ [ERROR] Get unread count database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('✅ [SUCCESS] Unread message count:', count || 0);
      return count || 0;
    } catch (error) {
      console.error('❌ [ERROR] Get unread count exception:', error);
      return 0;
    }
  }

  // Search messages by content
  static async searchMessages(query: string, limit: number = 20): Promise<MessageWithSender[]> {
    try {
      console.log('🔍 [DEBUG] MessagingService.searchMessages called:', {
        query,
        limit,
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [ERROR] User not authenticated in searchMessages:', userError);
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            full_name,
            username,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [ERROR] Search messages database error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('✅ [SUCCESS] Message search completed:', data?.length || 0, 'results');
      return data || [];
    } catch (error) {
      console.error('❌ [ERROR] Search messages exception:', error);
      throw error;
    }
  }
}