import ClientLayout from '@/components/ClientLayout';

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
