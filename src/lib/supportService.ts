import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SupportMessage {
  id: string;
  sender: 'user' | 'support';
  sender_name: string;
  text: string;
  created_at: string;
}

export interface SupportDialog {
  status: 'open' | 'closed';
  messages: SupportMessage[];
  last_updated: string;
}

// In-memory + temporary disk fallback for guest chats
const guestChatsMap = new Map<string, SupportMessage[]>();
const GUEST_CHATS_FILE = path.join(os.tmpdir(), 'guest_support_chats.json');

function loadGuestChats(): Record<string, SupportMessage[]> {
  try {
    if (fs.existsSync(GUEST_CHATS_FILE)) {
      const data = JSON.parse(fs.readFileSync(GUEST_CHATS_FILE, 'utf8'));
      return data;
    }
  } catch (e) {}
  return {};
}

function persistGuestChats(chats: Record<string, SupportMessage[]>) {
  try {
    const dir = path.dirname(GUEST_CHATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GUEST_CHATS_FILE, JSON.stringify(chats), 'utf8');
  } catch (e) {}
}

export const supportService = {
  /**
   * Get all messages for an authenticated user
   */
  async getUserMessages(userId: string): Promise<SupportMessage[]> {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('raw_onboarding_data')
        .eq('id', userId)
        .maybeSingle();

      const raw = (profile?.raw_onboarding_data || {}) as Record<string, any>;
      const dialog = raw.support_dialog as SupportDialog | undefined;
      return Array.isArray(dialog?.messages) ? dialog.messages : [];
    } catch (err) {
      console.error('[SupportService] Error getting user messages:', err);
      return [];
    }
  },

  /**
   * Save a message from an authenticated user
   */
  async saveUserMessage(userId: string, text: string, senderName?: string): Promise<SupportMessage | null> {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, raw_onboarding_data, full_name, email, telegram_id')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) return null;

      const raw = (profile.raw_onboarding_data || {}) as Record<string, any>;
      const dialog = (raw.support_dialog || {}) as Partial<SupportDialog>;
      const messages: SupportMessage[] = Array.isArray(dialog.messages) ? [...dialog.messages] : [];

      const newMsg: SupportMessage = {
        id: crypto.randomUUID(),
        sender: 'user',
        sender_name: senderName || profile.full_name || 'Пользователь',
        text: text.trim(),
        created_at: new Date().toISOString()
      };

      messages.push(newMsg);

      await supabaseAdmin
        .from('profiles')
        .update({
          raw_onboarding_data: {
            ...raw,
            support_dialog: {
              status: 'open',
              messages: messages.slice(-60),
              last_updated: new Date().toISOString()
            }
          }
        })
        .eq('id', userId);

      return newMsg;
    } catch (err) {
      console.error('[SupportService] Error saving user message:', err);
      return null;
    }
  },

  /**
   * Save an admin reply to a user (by userId or telegramId)
   */
  async saveAdminReply(targetId: string, replyText: string): Promise<{ success: boolean; profile?: any; message?: SupportMessage }> {
    try {
      // 1. Try finding by userId first
      let { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, raw_onboarding_data, full_name, email, telegram_id')
        .eq('id', targetId)
        .maybeSingle();

      // 2. Fallback: try finding by telegram_id
      if (!profile) {
        const { data: byTg } = await supabaseAdmin
          .from('profiles')
          .select('id, raw_onboarding_data, full_name, email, telegram_id')
          .eq('telegram_id', targetId)
          .maybeSingle();
        profile = byTg;
      }

      if (profile) {
        const raw = (profile.raw_onboarding_data || {}) as Record<string, any>;
        const dialog = (raw.support_dialog || {}) as Partial<SupportDialog>;
        const messages: SupportMessage[] = Array.isArray(dialog.messages) ? [...dialog.messages] : [];

        const adminMsg: SupportMessage = {
          id: crypto.randomUUID(),
          sender: 'support',
          sender_name: 'Служба поддержки Viral Studio',
          text: replyText.trim(),
          created_at: new Date().toISOString()
        };

        messages.push(adminMsg);

        await supabaseAdmin
          .from('profiles')
          .update({
            raw_onboarding_data: {
              ...raw,
              support_dialog: {
                status: 'open',
                messages: messages.slice(-60),
                last_updated: new Date().toISOString()
              }
            }
          })
          .eq('id', profile.id);

        return { success: true, profile, message: adminMsg };
      }

      // 3. Fallback: Check if targetId is a guest ID
      if (targetId.startsWith('guest_')) {
        const adminMsg = await this.saveAdminReplyToGuest(targetId, replyText);
        return { success: !!adminMsg, message: adminMsg || undefined };
      }

      return { success: false };
    } catch (err) {
      console.error('[SupportService] Error saving admin reply:', err);
      return { success: false };
    }
  },

  /**
   * Get guest messages
   */
  getGuestMessages(guestId: string): SupportMessage[] {
    if (guestChatsMap.has(guestId)) {
      return guestChatsMap.get(guestId)!;
    }
    const all = loadGuestChats();
    const list = all[guestId] || [];
    guestChatsMap.set(guestId, list);
    return list;
  },

  /**
   * Save guest message
   */
  saveGuestMessage(guestId: string, text: string, guestName?: string): SupportMessage {
    const list = this.getGuestMessages(guestId);
    const msg: SupportMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      sender_name: guestName || 'Гость',
      text: text.trim(),
      created_at: new Date().toISOString()
    };
    list.push(msg);
    const trimmed = list.slice(-40);
    guestChatsMap.set(guestId, trimmed);

    const all = loadGuestChats();
    all[guestId] = trimmed;
    persistGuestChats(all);

    return msg;
  },

  /**
   * Save admin reply to guest
   */
  saveAdminReplyToGuest(guestId: string, text: string): SupportMessage | null {
    const list = this.getGuestMessages(guestId);
    const msg: SupportMessage = {
      id: crypto.randomUUID(),
      sender: 'support',
      sender_name: 'Служба поддержки Viral Studio',
      text: text.trim(),
      created_at: new Date().toISOString()
    };
    list.push(msg);
    const trimmed = list.slice(-40);
    guestChatsMap.set(guestId, trimmed);

    const all = loadGuestChats();
    all[guestId] = trimmed;
    persistGuestChats(all);

    return msg;
  }
};
