import ClientLayout from '@/components/ClientLayout';

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
