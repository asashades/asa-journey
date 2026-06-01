import ClientLayout from '@/components/ClientLayout';

export default function TagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
