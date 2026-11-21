import { useMemo } from 'react';
import { boardCells } from '../game/board.js';
import Cell from './Cell.jsx';

export default function Board({ cur }) {
  const { cols, rows, ansRow, cells } = useMemo(() => boardCells(cur), [cur]);
  const style = {
    '--cols': cols,
    '--ans-row': ansRow,
    gridTemplateRows: 'repeat(' + rows + ', var(--cell))',
    // wide boards (3-4 digit ×) shrink so they fit a phone
    ...(cols > 5 ? { '--cell': 'clamp(30px, calc(88vw / ' + (cols + 1) + '), 84px)' } : {})
  };
  return (
    <div className="board-wrap">
      <div className="board" style={style} aria-label="Math problem">
        {cells.map((c) => <Cell key={c.key} cls={c.cls} text={c.text} style={c.style} old={c.old} />)}
      </div>
    </div>
  );
}
