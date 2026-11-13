import 'server-only';
import { after } from 'next/server';
import { getNotifier } from './auth';
import { getDb } from './server';
import { notifyNewMessage } from './notifications';

/** Efter svaret er sendt: mail til modtageren, hvis hen ikke er på siden (se notifyNewMessage). Fejl logges kun. */
export function notifyAfterMessage(conversationId: string, senderId: string): void {
  after(async () => {
    try {
      const { mailer, appUrl } = getNotifier();
      await notifyNewMessage(getDb(), mailer, appUrl, conversationId, senderId);
    } catch (e) {
      console.error('besked-mail-fejl', e instanceof Error ? e.message : 'ukendt');
    }
  });
}
