import ClientLayout from '@/components/ClientLayout';

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
