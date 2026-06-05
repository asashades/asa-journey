import TokenDetailPage from '@/components/collections/TokenDetailPage';

export function generateStaticParams() {
  return [{ person: 'index' }];
}

export default async function PersonDetailPage({ params }: { params: Promise<{ person: string }> }) {
  const { person } = await params;
  return <TokenDetailPage kind="person" name={person || ''} />;
}
