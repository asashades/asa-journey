import ClientLayout from '@/components/ClientLayout';

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}