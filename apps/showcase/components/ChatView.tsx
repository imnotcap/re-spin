'use client';

import { useState } from 'react';
import { Badge, ChatBubble, ChatDay, ChatThread, Composer, OfferCard, ScreenContent } from '@respin/ui';

export function ChatView() {
  const [msgs, setMsgs] = useState<string[]>([]);
  return (
    <>
      <ScreenContent>
        <ChatThread>
          <ChatDay>I dag</ChatDay>
          <ChatBubble time="9:41">Hej! Er den stadig til salg?</ChatBubble>
          <ChatBubble from="me" time="9:43">Ja, den er stadig til salg</ChatBubble>
          <OfferCard amount="300 kr." status={<Badge tone="warn" icon="clock">Afventer svar</Badge>} />
          {msgs.map((m, i) => <ChatBubble key={i} from="me" time="nu">{m}</ChatBubble>)}
        </ChatThread>
      </ScreenContent>
      <Composer onSend={(t) => setMsgs((p) => [...p, t])} />
    </>
  );
}
