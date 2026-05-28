import ClientLayout from '@/components/ClientLayout';

export default function OtherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
