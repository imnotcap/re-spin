import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MemberProfile, memberMetadata } from '../../../components/listings/live';

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return memberMetadata(decodeURIComponent((await params).name));
}

/** Medlemsprofil: /@/<profilnavn> */
export default async function ProfilePage({ params }: Props) {
  const member = await MemberProfile({ name: decodeURIComponent((await params).name) });
  if (!member) notFound();
  return member;
}
