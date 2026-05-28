import ClientLayout from '@/components/ClientLayout';

export default function ReflectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
