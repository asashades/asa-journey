import ClientLayout from '@/components/ClientLayout';

export default function WriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
