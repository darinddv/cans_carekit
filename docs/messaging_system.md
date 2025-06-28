# Messaging System Documentation

This document provides comprehensive documentation for the secure messaging feature in the Care Card application, with detailed explanations of Row Level Security (RLS) implementation, common pitfalls, and troubleshooting guidance.

## Overview

The messaging system enables secure communication between healthcare providers and patients within the Care Card platform. It features real-time messaging, conversation management, and robust security through Supabase's Row Level Security (RLS) policies.

### Key Features

- **Secure Messaging**: End-to-end encrypted communication between care team members
- **Real-time Updates**: Live message delivery and read receipts
- **Conversation Management**: Organized chat threads with unread message counts
- **User Search**: Find and start conversations with care team members
- **Role-based Access**: Different interfaces for providers and patients
- **Message Status**: Delivery and read confirmation indicators

## Architecture Overview

### Database Schema

The messaging system consists of two main tables:

#### 1. Messages Table (`public.messages`)

```sql
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamp with time zone NULL
);
```

**Key Fields:**
- `sender_id`: References the user who sent the message
- `receiver_id`: References the user who received the message
- `content`: The message text content
- `read_at`: Timestamp when the message was read (NULL if unread)

#### 2. Users Table (`public.users`)

The existing users table stores profile information that's joined with messages to display sender/receiver details.

### File Structure

```
lib/
├── messagingService.ts          # Core messaging operations
├── supabaseService.ts          # Database service layer
app/(tabs)/
├── messages.tsx                # Main messaging interface
├── _layout.tsx                 # Tab navigation with Messages tab
supabase/migrations/
├── 20250628040946_misty_peak.sql      # Messages table creation
├── 20250628041638_shy_art.sql         # RLS policies for messages
├── 20250628044434_sparkling_jungle.sql # Fixed users RLS policy
```

## Row Level Security (RLS) Implementation

### The Challenge

RLS is crucial for ensuring users can only access messages they're authorized to see. However, messaging systems present unique challenges because they require:

1. **Bidirectional Access**: Both sender and receiver need to see the same messages
2. **Profile Information**: Users need to see profile details of their conversation partners
3. **Join Operations**: Message queries often join with the users table for display names, avatars, etc.

### Messages Table RLS Policies

#### 1. SELECT Policy - View Messages
```sql
CREATE POLICY "Users can view their own messages" ON public.messages
FOR SELECT USING (
  (auth.uid() = sender_id) OR (auth.uid() = receiver_id)
);
```

**Purpose**: Allows users to view messages where they are either the sender or receiver.

**Key Points**:
- Uses `OR` condition to allow bidirectional access
- Applies to all authenticated users
- Essential for conversation threads to work properly

#### 2. INSERT Policy - Send Messages
```sql
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
```

**Purpose**: Ensures users can only send messages as themselves.

**Key Points**:
- Prevents message spoofing
- Uses `WITH CHECK` to validate the sender_id on insert
- Critical for message authenticity

#### 3. UPDATE Policy - Mark as Read
```sql
CREATE POLICY "Users can mark messages as read" ON public.messages
FOR UPDATE USING (
  auth.uid() = receiver_id
) WITH CHECK (
  auth.uid() = receiver_id
);
```

**Purpose**: Allows only the message recipient to mark messages as read.

**Key Points**:
- Uses both `USING` and `WITH CHECK` for complete protection
- Prevents users from marking others' messages as read
- Essential for accurate read status tracking

#### 4. DELETE Policy - Remove Messages
```sql
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (
  auth.uid() = sender_id
);
```

**Purpose**: Allows users to delete only their own sent messages.

**Key Points**:
- Only senders can delete their messages
- Recipients cannot delete messages sent to them
- Maintains message history integrity

### Users Table RLS Policy - The Critical Fix

#### The Problem We Encountered

Initially, the users table had a policy that only allowed:
1. Users to view their own profile
2. Providers to view their patients' profiles

However, this created a critical issue: **patients couldn't view their providers' profiles**.

#### Why This Broke Messaging

When the messaging system queries for conversations, it performs joins like this:

```sql
SELECT messages.*, 
       sender.email, sender.full_name, sender.avatar_url,
       receiver.email, receiver.full_name, receiver.avatar_url
FROM messages
JOIN users sender ON messages.sender_id = sender.id
JOIN users receiver ON messages.receiver_id = receiver.id
```

If a patient tried to view a message from a provider, the join would fail to return the provider's profile information because the patient wasn't allowed to "see" the provider's user record.

#### The Solution

We updated the users table RLS policy to allow **bidirectional viewing** in care relationships:

```sql
CREATE POLICY "Users can view profiles in care relationships" ON public.users
FOR SELECT USING (
  -- Users can view their own profile
  (auth.uid() = id) 
  OR 
  -- Providers can view their patients' profiles
  (EXISTS (
    SELECT 1 FROM care_relationships cr 
    WHERE cr.provider_id = auth.uid() AND cr.patient_id = users.id
  ))
  OR
  -- Patients can view their providers' profiles
  (EXISTS (
    SELECT 1 FROM care_relationships cr 
    WHERE cr.patient_id = auth.uid() AND cr.provider_id = users.id
  ))
);
```

**Key Changes**:
- Added the third condition for patients to view providers
- Uses `care_relationships` table to verify legitimate relationships
- Maintains security by requiring an established care relationship
- Enables proper message display for both parties

## Service Layer Implementation

### MessagingService Class

The `MessagingService` class provides a clean API for all messaging operations:

#### Core Methods

##### 1. Send Message
```typescript
static async sendMessage(receiverId: string, content: string): Promise<Message>
```

**Features**:
- Validates user authentication
- Inserts message with current user as sender
- Returns the created message record
- Includes comprehensive error handling and logging

##### 2. Get Conversation
```typescript
static async getConversation(otherUserId: string, limit: number = 50): Promise<MessageWithSender[]>
```

**Features**:
- Fetches messages between current user and specified user
- Includes sender profile information via join
- Orders messages chronologically
- Supports pagination with limit parameter

##### 3. Get Conversations List
```typescript
static async getConversations(): Promise<Conversation[]>
```

**Features**:
- Fetches all conversations for current user
- Groups messages by conversation partner
- Calculates unread message counts
- Returns last message for each conversation
- Sorts by most recent activity

##### 4. Mark Messages as Read
```typescript
static async markMessagesAsRead(senderId: string): Promise<void>
```

**Features**:
- Updates read_at timestamp for unread messages
- Only affects messages sent to current user
- Enables read receipt functionality

##### 5. Real-time Subscriptions
```typescript
static subscribeToConversation(otherUserId: string, callback: (message: Message) => void): () => void
static subscribeToAllConversations(callback: (message: Message) => void): () => void
```

**Features**:
- Real-time message delivery using Supabase subscriptions
- Automatic UI updates when new messages arrive
- Proper cleanup with unsubscribe functions

### Debugging and Logging

The service includes comprehensive logging for troubleshooting:

```typescript
console.log('🔍 [DEBUG] MessagingService.sendMessage called:', {
  receiverId,
  contentLength: content.length,
});
```

**Log Categories**:
- `🔍 [DEBUG]`: Detailed operation tracking
- `✅ [SUCCESS]`: Successful operations
- `❌ [ERROR]`: Error conditions
- `⚠️ [WARNING]`: Potential issues

## User Interface Implementation

### Main Components

#### 1. Conversations List View
- Displays all active conversations
- Shows participant names, avatars, and roles
- Indicates unread message counts
- Provides search functionality for new conversations

#### 2. Individual Conversation View
- Real-time message display
- Message bubbles with sender identification
- Read status indicators
- Message input with send functionality

#### 3. New Conversation Modal
- User search by email address
- Role-based user identification
- Filtered results (excludes current user and existing conversations)

### Responsive Design

The interface adapts to different screen sizes:

- **Mobile**: Full-screen conversation view with back navigation
- **Tablet**: Enhanced spacing and larger touch targets
- **Desktop**: Optimized layout with larger text and improved spacing

### Real-time Updates

The UI subscribes to real-time message updates:

```typescript
useEffect(() => {
  const unsubscribe = MessagingService.subscribeToAllConversations(
    (message) => {
      // Update UI with new message
      loadConversations();
    }
  );

  return unsubscribe;
}, []);
```

## Security Considerations

### Data Protection

1. **Message Content**: All messages are stored securely in Supabase
2. **User Authentication**: All operations require valid authentication
3. **Access Control**: RLS policies prevent unauthorized access
4. **Input Validation**: Message content is sanitized and length-limited

### Privacy Features

1. **Conversation Isolation**: Users can only see their own conversations
2. **Profile Visibility**: User profiles are only visible within care relationships
3. **Message Deletion**: Users can delete their own sent messages
4. **Read Receipts**: Only message recipients can mark messages as read

### HIPAA Compliance Considerations

1. **Audit Trail**: All message operations are logged
2. **Access Controls**: Strict RLS policies limit data access
3. **Encryption**: Data is encrypted in transit and at rest
4. **User Consent**: Clear messaging about data usage and privacy

## Common Issues and Troubleshooting

### Issue 1: Messages Not Appearing

**Symptoms**: User can send messages but cannot see received messages

**Likely Causes**:
1. RLS policy on messages table too restrictive
2. User authentication issues
3. Incorrect sender/receiver IDs

**Debugging Steps**:
1. Check browser network tab for failed requests
2. Verify RLS policies allow bidirectional access
3. Confirm user authentication status
4. Check database for message records

**Solution**: Ensure messages RLS policy includes both sender and receiver access:
```sql
(auth.uid() = sender_id) OR (auth.uid() = receiver_id)
```

### Issue 2: Profile Information Missing in Messages

**Symptoms**: Messages appear but sender/receiver names show as null or undefined

**Likely Causes**:
1. Users table RLS policy too restrictive
2. Missing care relationship records
3. Incorrect join queries

**Debugging Steps**:
1. Check if user profile data is being returned in API responses
2. Verify care relationships exist in database
3. Test users table RLS policy directly

**Solution**: Update users table RLS policy to allow bidirectional viewing:
```sql
-- Add condition for patients to view providers
(EXISTS (
  SELECT 1 FROM care_relationships cr 
  WHERE cr.patient_id = auth.uid() AND cr.provider_id = users.id
))
```

### Issue 3: Real-time Updates Not Working

**Symptoms**: Messages don't appear immediately, require page refresh

**Likely Causes**:
1. Subscription not properly set up
2. Network connectivity issues
3. Supabase real-time not enabled

**Debugging Steps**:
1. Check browser console for subscription errors
2. Verify Supabase real-time is enabled in project settings
3. Test subscription setup and cleanup

**Solution**: Ensure proper subscription management:
```typescript
useEffect(() => {
  const unsubscribe = MessagingService.subscribeToConversation(
    otherUserId,
    handleNewMessage
  );
  
  return unsubscribe; // Critical: cleanup on unmount
}, [otherUserId]);
```

### Issue 4: Search Not Finding Users

**Symptoms**: User search returns no results for valid email addresses

**Likely Causes**:
1. Search query case sensitivity
2. RLS policy preventing user discovery
3. Missing care relationships

**Debugging Steps**:
1. Test search query directly in database
2. Check if users exist with exact email
3. Verify search user has appropriate permissions

**Solution**: Use case-insensitive search and verify RLS policies:
```sql
.ilike('email', `%${email}%`)  -- Case-insensitive search
```

## Performance Optimization

### Database Indexes

Critical indexes for messaging performance:

```sql
CREATE INDEX messages_sender_id_idx ON public.messages USING btree (sender_id);
CREATE INDEX messages_receiver_id_idx ON public.messages USING btree (receiver_id);
CREATE INDEX messages_created_at_idx ON public.messages USING btree (created_at);
```

### Query Optimization

1. **Limit Results**: Use pagination for large conversation histories
2. **Selective Joins**: Only join user data when needed for display
3. **Efficient Filtering**: Use indexed columns in WHERE clauses

### Caching Strategy

1. **Conversation List**: Cache conversation metadata
2. **User Profiles**: Cache frequently accessed profile information
3. **Message Counts**: Cache unread message counts with periodic refresh

## Testing Strategy

### Unit Tests

Test individual service methods:

```typescript
describe('MessagingService', () => {
  test('should send message successfully', async () => {
    const message = await MessagingService.sendMessage(receiverId, content);
    expect(message.sender_id).toBe(currentUserId);
    expect(message.content).toBe(content);
  });
});
```

### Integration Tests

Test complete messaging workflows:

1. Send message between users
2. Verify message appears in both conversations
3. Test read status updates
4. Verify real-time delivery

### RLS Policy Testing

Test security policies directly:

```sql
-- Test as patient user
SET request.jwt.claims TO '{"sub": "patient-user-id"}';
SELECT * FROM messages; -- Should only return patient's messages

-- Test as provider user  
SET request.jwt.claims TO '{"sub": "provider-user-id"}';
SELECT * FROM messages; -- Should only return provider's messages
```

## Migration Guide

### Database Migrations

The messaging feature requires several migrations:

1. **Create Messages Table**: Basic table structure with foreign keys
2. **Add RLS Policies**: Security policies for messages table
3. **Update Users RLS**: Fix bidirectional profile viewing
4. **Add Indexes**: Performance optimization indexes

### Deployment Checklist

- [ ] Run all messaging-related migrations
- [ ] Verify RLS policies are active
- [ ] Test messaging between different user roles
- [ ] Confirm real-time subscriptions work
- [ ] Validate search functionality
- [ ] Check mobile responsiveness
- [ ] Test error handling and edge cases

## Future Enhancements

### Planned Features

1. **Message Attachments**: Support for images and files
2. **Message Reactions**: Emoji reactions to messages
3. **Message Threading**: Reply to specific messages
4. **Group Conversations**: Multi-participant conversations
5. **Message Search**: Full-text search within conversations
6. **Message Encryption**: Client-side encryption for enhanced security

### Technical Improvements

1. **Offline Support**: Cache messages for offline viewing
2. **Push Notifications**: Real-time notifications for new messages
3. **Message Sync**: Conflict resolution for concurrent edits
4. **Performance Monitoring**: Track message delivery times
5. **Analytics**: Conversation engagement metrics

## Conclusion

The messaging system provides a secure, real-time communication platform for healthcare teams. The key to successful implementation is understanding the RLS requirements and ensuring bidirectional access patterns work correctly.

### Key Takeaways

1. **RLS Complexity**: Messaging requires careful consideration of bidirectional access patterns
2. **Join Dependencies**: Profile information access affects message display functionality
3. **Real-time Challenges**: Subscription management is critical for live updates
4. **Security First**: Always prioritize data protection and access control
5. **Comprehensive Testing**: Test all user roles and edge cases thoroughly

### Best Practices

1. **Start Simple**: Begin with basic messaging, add features incrementally
2. **Test Early**: Verify RLS policies work for all user types
3. **Log Everything**: Comprehensive logging aids in debugging
4. **Monitor Performance**: Track query performance and optimize as needed
5. **Plan for Scale**: Design with future growth and features in mind

The messaging system demonstrates how to build secure, real-time features in a healthcare application while maintaining strict data protection and user privacy standards.