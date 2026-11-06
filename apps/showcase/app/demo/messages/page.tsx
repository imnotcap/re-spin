import { ConversationRow, Notice, Screen, ScreenContent, TopBar } from '@respin/ui';
import { DemoTabBar } from '../../../components/DemoTabBar';
import { conversations } from '../../../lib/data';

export default function Messages() {
  return (
    <Screen>
      <TopBar align="left" title="Beskeder" />
      <ScreenContent withTabBar>
        {conversations.map((c) => <ConversationRow key={c.id} {...c} href={`/demo/messages/${c.id}`} />)}
        <div style={{ padding: 16 }}><Notice>Hold al kommunikation og betaling i appen, så er du dækket af køberbeskyttelsen.</Notice></div>
      </ScreenContent>
      <DemoTabBar />
    </Screen>
  );
}
