export default function Cell({ cls, text, style }) {
  return <div className={'cell ' + cls} style={style}>{text}</div>;
}
