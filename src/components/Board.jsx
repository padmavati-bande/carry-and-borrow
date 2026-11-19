import { boardCells } from '../game/board.js';
import Cell from './Cell.jsx';

export default function Board({ cur }) {
  const { cols, rows, ansRow, cells } = boardCells(cur);
  const style = {
    '--cols': cols,
    '--ans-row': ansRow,
    gridTemplateRows: 'repeat(' + rows + ', var(--cell))'
  };
  return (
    <div className="board-wrap">
      <div className="board" style={style} aria-label="Math problem">
        {cells.map((c) => <Cell key={c.key} cls={c.cls} text={c.text} style={c.style} />)}
      </div>
    </div>
  );
}
