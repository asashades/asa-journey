import ClientLayout from '@/components/ClientLayout';

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
