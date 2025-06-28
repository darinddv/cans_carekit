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
  };
  lastMessage: Message | null;
  unreadCount: number;
}

export class MessagingService {
  // Send a new message
  static async sendMessage(receiverId: string, content: string): Promise<Message> {
    try {
      console.log('Sending message to:', receiverId);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const messageData: MessageInsert = {
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Send message error:', error);
        throw error;
      }

      console.log('Message sent successfully');
      return data;
    } catch (error) {
      console.error('Send message exception:', error);
      throw error;
    }
  }

  // Get messages between current user and another user
  static async getConversation(otherUserId: string, limit: number = 50): Promise<MessageWithSender[]> {
    try {
      console.log('Getting conversation with user:', otherUserId);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
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
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Get conversation error:', error);
        throw error;
      }

      console.log('Conversation loaded successfully:', data?.length || 0, 'messages');
      return data || [];
    } catch (error) {
      console.error('Get conversation exception:', error);
      throw error;
    }
  }

  // Get all conversations for current user
  static async getConversations(): Promise<Conversation[]> {
    try {
      console.log('Getting all conversations...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

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
            avatar_url
          ),
          receiver:users!messages_receiver_id_fkey(
            id,
            email,
            full_name,
            username,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get conversations error:', error);
        throw error;
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((message: any) => {
        const isCurrentUserSender = message.sender_id === user.id;
        const participant = isCurrentUserSender ? message.receiver : message.sender;
        
        // Add null check for participant
        if (!participant || !participant.id) {
          console.warn('Skipping message with null participant:', message.id);
          return;
        }

        if (!conversationMap.has(participant.id)) {
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
          existingConversation.lastMessage = message;
        }

        // Count unread messages (messages sent to current user that haven't been read)
        if (!isCurrentUserSender && !message.read_at) {
          existingConversation.unreadCount++;
        }
      });

      const conversations = Array.from(conversationMap.values())
        .sort((a, b) => {
          if (!a.lastMessage || !b.lastMessage) return 0;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

      console.log('Conversations loaded successfully:', conversations.length);
      return conversations;
    } catch (error) {
      console.error('Get conversations exception:', error);
      throw error;
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(senderId: string): Promise<void> {
    try {
      console.log('Marking messages as read from:', senderId);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Mark messages as read error:', error);
        throw error;
      }

      console.log('Messages marked as read successfully');
    } catch (error) {
      console.error('Mark messages as read exception:', error);
      throw error;
    }
  }

  // Delete a message (only sender can delete)
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      console.log('Deleting message:', messageId);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) {
        console.error('Delete message error:', error);
        throw error;
      }

      console.log('Message deleted successfully');
    } catch (error) {
      console.error('Delete message exception:', error);
      throw error;
    }
  }

  // Subscribe to real-time message updates for a conversation
  static subscribeToConversation(
    otherUserId: string,
    callback: (message: Message) => void
  ): () => void {
    console.log('Setting up real-time subscription for conversation with:', otherUserId);

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
          console.log('New message received:', payload);
          callback(payload.new as Message);
        }
      )
      .subscribe((status) => {
        console.log('Conversation subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from conversation updates');
      subscription.unsubscribe();
    };
  }

  // Subscribe to real-time updates for all conversations
  static subscribeToAllConversations(
    callback: (message: Message) => void
  ): () => void {
    console.log('Setting up real-time subscription for all conversations');

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
          console.log('Message update received:', payload);
          if (payload.eventType === 'INSERT') {
            callback(payload.new as Message);
          }
        }
      )
      .subscribe((status) => {
        console.log('All conversations subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from all conversation updates');
      subscription.unsubscribe();
    };
  }

  // Get unread message count for current user
  static async getUnreadMessageCount(): Promise<number> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Get unread count error:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Get unread count exception:', error);
      return 0;
    }
  }

  // Search messages by content
  static async searchMessages(query: string, limit: number = 20): Promise<MessageWithSender[]> {
    try {
      console.log('Searching messages for:', query);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
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
        console.error('Search messages error:', error);
        throw error;
      }

      console.log('Message search completed:', data?.length || 0, 'results');
      return data || [];
    } catch (error) {
      console.error('Search messages exception:', error);
      throw error;
    }
  }
}