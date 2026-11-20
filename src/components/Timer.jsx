// green under 50 %, yellow under 75 %, red after
function band(elapsed, limit) { return elapsed < limit * 0.5 ? 'green' : elapsed < limit * 0.75 ? 'yellow' : 'red'; }

// thin bar in the title bar; flex fills the space between title and chips
export default function Timer({ elapsed, limit }) {
  const left = Math.max(0, limit - elapsed);
  return (
    <div className="timer" role="timer" aria-label={left + ' seconds left'}>
      <div className={'timer-fill ' + band(elapsed, limit)} style={{ width: (left / limit) * 100 + '%' }} />
    </div>
  );
}
