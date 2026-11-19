const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

export default function Keypad({ onPress, onBackspace }) {
  return (
    <div className="keypad" aria-label="Number keypad">
      {KEYS.map((k) => <button type="button" key={k} onClick={() => onPress(k)}>{k}</button>)}
      <button type="button" data-key="0" className="zero" onClick={() => onPress('0')}>0</button>
      <button type="button" aria-label="Backspace" onClick={onBackspace}>&#9003;</button>
    </div>
  );
}
