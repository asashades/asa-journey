import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';

const reflectiveMessages = [
  'Gathering your moments...',
  'Connecting your thoughts...',
  'Analyzing weekly themes...',
  'Finding hidden patterns...',
  'Quietly polishing your observatory...',
  'Sifting through your stars...'
];

export default function AILoadingState() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % reflectiveMessages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EEF0EF] bg-white p-12 text-center shadow-sm">
      {/* Dynamic Cosmic Orbit Loading Circle */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
        <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
        <div className="h-3 w-3 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
      </div>

      <h3 className="font-serif text-xl font-bold text-[#2F3331]">Cosmic Recap</h3>
      <p className="mt-2 text-sm text-[#A3A7A8] font-mono animate-pulse transition-opacity duration-500">
        {reflectiveMessages[msgIdx]}
      </p>
    </div>
  );
}
