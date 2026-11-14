'use client';

import { useEffect, useState } from 'react';

export default function TodayDate() {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(
      new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  return <p className="mt-1 text-sm text-zinc-400 capitalize">{formatted}</p>;
}