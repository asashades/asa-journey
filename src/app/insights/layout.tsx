import ClientLayout from '@/components/ClientLayout';

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
