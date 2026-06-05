import TokenDetailPage from '@/components/collections/TokenDetailPage';

export function generateStaticParams() {
  return [{ tag: 'index' }];
}

export default async function TagDetailPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  return <TokenDetailPage kind="tag" name={tag || ''} />;
}
