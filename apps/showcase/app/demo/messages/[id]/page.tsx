import { Screen, TopBar } from '@respin/ui';
import { ChatView } from '../../../../components/ChatView';
import { conversations } from '../../../../lib/data';

export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convo = conversations.find((c) => String(c.id) === id) ?? conversations[0];
  return (
    <Screen>
      <TopBar title={convo.name} backHref="/demo/messages" />
      <ChatView />
    </Screen>
  );
}
