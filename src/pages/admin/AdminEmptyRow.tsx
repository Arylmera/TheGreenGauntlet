type Props = { isMario: boolean; searching: boolean };

export function AdminEmptyRow({ isMario, searching }: Props) {
  const message = searching
    ? isMario
      ? 'NO MATCH'
      : 'No teams match your search.'
    : isMario
      ? 'NO TEAMS YET — WAITING FOR AGGREGATOR…'
      : 'No teams yet — waiting for first aggregator tick.';
  return (
    <tr>
      <td
        colSpan={10}
        className={
          isMario
            ? 'px-4 py-6 text-center font-crt text-lg text-[color:var(--mario-ink-soft)]'
            : 'px-4 py-6 text-center text-ink-mid dark:text-dark-dim text-sm'
        }
      >
        {message}
      </td>
    </tr>
  );
}
