import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface AIEmptyStateProps {
  message?: string;
}

export default function AIEmptyState({ message }: AIEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-8 text-center shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFCC33]/10 text-[#FFCC33]">
        <FontAwesomeIcon icon={faCircleInfo} className="h-5 w-5" />
      </div>
      <h3 className="font-serif text-lg font-bold text-[#2F3331] dark:text-[#FAFAFA]">Not Enough Entries</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#6F7476] dark:text-[#A3A7A8] max-w-[360px]">
        {message || 'Jurnal Anda dalam 7 hari terakhir masih kosong. Tulis beberapa catatan harian terlebih dahulu agar Cosmic Recap dapat membaca pola dan merangkum pertumbuhan diri Anda!'}
      </p>
    </div>
  );
}
