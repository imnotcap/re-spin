import { Screen, TopBar } from '@respin/ui';
import { SellForm } from '../../../components/SellForm';

export default function SellPage() {
  return (
    <Screen>
      <TopBar title="Sælg noget nyt" backHref="/demo" />
      <SellForm />
    </Screen>
  );
}
