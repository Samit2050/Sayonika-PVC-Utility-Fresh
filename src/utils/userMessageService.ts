import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';

export type MessageCategory = 
  | 'subscription'
  | 'custom_card'
  | 'pc_binding'
  | 'technical_issue'
  | 'feedback'
  | 'other';

export type MessageStatus = 'unread' | 'read' | 'replied' | 'resolved';

export interface UserMessage {
  id: string;
  userId: string;
  userName: string;
  userMobile?: string;
  category: MessageCategory;
  subject: string;
  message: string;
  hardwareId?: string;
  status: MessageStatus;
  adminReply?: string;
  repliedBy?: string;
  repliedAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export const USER_MESSAGES_COLLECTION = 'user_messages';
const LOCAL_SENT_IDS_KEY = 'sayonika_sent_user_message_ids_v1';

/**
 * Get local tracking IDs for messages sent from this browser
 */
export function getLocalSentMessageIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_SENT_IDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a message ID to local device tracking
 */
export function recordLocalSentMessageId(msgId: string) {
  try {
    const ids = getLocalSentMessageIds();
    if (!ids.includes(msgId)) {
      ids.unshift(msgId);
      localStorage.setItem(LOCAL_SENT_IDS_KEY, JSON.stringify(ids.slice(0, 50)));
    }
  } catch {
    // ignore
  }
}

/**
 * Send a new message to the administrator
 */
export async function sendMessageToAdmin(payload: {
  userId: string;
  userName: string;
  userMobile?: string;
  category: MessageCategory;
  subject: string;
  message: string;
  hardwareId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!payload.userName.trim()) {
      return { success: false, error: 'Please enter your name.' };
    }
    if (!payload.message.trim()) {
      return { success: false, error: 'Please enter your message.' };
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newMessage: UserMessage = {
      id: msgId,
      userId: payload.userId || 'guest_user',
      userName: payload.userName.trim(),
      userMobile: (payload.userMobile || '').trim(),
      category: payload.category || 'other',
      subject: (payload.subject || 'Support & Feedback').trim(),
      message: payload.message.trim(),
      hardwareId: (payload.hardwareId || '').trim(),
      status: 'unread',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(db, USER_MESSAGES_COLLECTION, msgId);
    await setDoc(docRef, newMessage);

    // Save to local device list
    recordLocalSentMessageId(msgId);

    return { success: true, id: msgId };
  } catch (err: any) {
    console.error('Error sending message to admin:', err);
    return { success: false, error: err.message || 'Failed to send message.' };
  }
}

/**
 * Real-time listener for ALL user messages (Admin only)
 */
export function subscribeToAllUserMessages(
  onUpdate: (messages: UserMessage[]) => void
): () => void {
  try {
    const colRef = collection(db, USER_MESSAGES_COLLECTION);
    return onSnapshot(colRef, (snap) => {
      const list: UserMessage[] = [];
      snap.forEach((d) => {
        const data = d.data() as UserMessage;
        list.push({ ...data, id: d.id });
      });
      // Sort newest first
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    }, (error) => {
      console.warn('Firestore user messages sync error:', error);
      onUpdate([]);
    });
  } catch (err) {
    console.error('Failed to subscribe to user messages:', err);
    return () => {};
  }
}

/**
 * Real-time listener for messages relevant to a specific user/device
 */
export function subscribeToMyUserMessages(
  currentUserId: string,
  userMobile?: string,
  onUpdate?: (messages: UserMessage[]) => void
): () => void {
  if (!onUpdate) return () => {};
  try {
    const colRef = collection(db, USER_MESSAGES_COLLECTION);
    return onSnapshot(colRef, (snap) => {
      const localIds = new Set(getLocalSentMessageIds());
      const list: UserMessage[] = [];

      snap.forEach((d) => {
        const data = d.data() as UserMessage;
        const belongsToUser = 
          (currentUserId && data.userId && data.userId === currentUserId) ||
          (userMobile && data.userMobile && data.userMobile === userMobile) ||
          localIds.has(d.id);

        if (belongsToUser) {
          list.push({ ...data, id: d.id });
        }
      });

      // Sort newest first
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    }, (err) => {
      console.warn('Failed to sync user personal messages:', err);
      onUpdate([]);
    });
  } catch (err) {
    console.error('Error subscribing to my messages:', err);
    return () => {};
  }
}

/**
 * Admin replies to a user message
 */
export async function replyToUserMessage(
  messageId: string,
  replyText: string,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!replyText.trim()) {
      return { success: false, error: 'Reply text cannot be empty.' };
    }

    const docRef = doc(db, USER_MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, {
      adminReply: replyText.trim(),
      repliedBy: adminName || 'Admin',
      repliedAt: Date.now(),
      status: 'replied',
      updatedAt: Date.now(),
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error replying to user message:', err);
    return { success: false, error: err.message || 'Failed to send reply.' };
  }
}

/**
 * Update the status of a user message (e.g. mark read, resolved)
 */
export async function updateUserMessageStatus(
  messageId: string,
  status: MessageStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, USER_MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, {
      status,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error updating user message status:', err);
    return { success: false, error: err.message || 'Failed to update status.' };
  }
}

/**
 * Delete a user message (Admin only)
 */
export async function deleteUserMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, USER_MESSAGES_COLLECTION, messageId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting user message:', err);
    return { success: false, error: err.message || 'Failed to delete message.' };
  }
}
