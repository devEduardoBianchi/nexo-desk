const paths={
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  inbox:'M4 4h16l2 12v4H2v-4L4 4z M2 15h6l2 3h4l2-3h6',
  chart:'M4 3v17h17 M8 15V9 M13 15V5 M18 15v-4',
  book:'M12 6C8 3 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-1-10 2z M12 6v15',
  plus:'M12 5v14 M5 12h14',search:'m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow:'M5 12h14 m-6-6 6 6-6 6',diagonal:'M6 18 18 6 M6 6h12v12',
  sun:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  moon:'M20 14A9 9 0 0 1 10 4a9 9 0 1 0 10 10z',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',close:'m6 6 12 12 M6 18 18 6',
  clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
  flame:'M12 2c1 7 7 7 7 13a7 7 0 0 1-14 0c0-4 3-6 3-6s-1 4 2 4c3 0 4-6 2-11z',
  check:'m5 12 4 4L19 6',circle:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  user:'M8 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  filter:'M4 7h16 M7 12h10 M10 17h4',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
  list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.1 M3 12h.1 M3 18h.1',
  board:'M3 4h5v16H3z M10 4h5v10h-5z M17 4h5v13h-5z',refresh:'M20 8a9 9 0 1 0 1 8 M20 3v5h-5',
  menu:'M3 6h18 M3 12h18 M3 18h18',external:'M14 3h7v7 M10 14 21 3 M10 3H3v18h18v-7',
  bolt:'m13 2-9 12h7l-1 8 10-13h-7z',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0',
  edit:'m15 4 5 5 M3 21l5-1L21 7l-5-5L3 15v6z',undo:'M9 4 3 10l6 6 M3 10h10a7 7 0 0 1 7 7v3',
  note:'M4 3h16v18H4z M8 8h8 M8 12h8 M8 16h5',shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4z M8 12l3 3 5-6'
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.circle}"/></svg>`;
export const logo=()=>'<svg class="logo-mark" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="currentColor"/><path class="logo-stroke" d="M14 33V15h5l10 18h5V15" fill="none" stroke="#172017" stroke-width="5" stroke-linejoin="round"/></svg>';
