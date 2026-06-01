import ClientLayout from '@/components/ClientLayout';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
