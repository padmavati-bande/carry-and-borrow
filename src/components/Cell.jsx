export default function Cell({ cls, text, style, old }) {
  return <div className={'cell ' + cls} style={style}>{text}{old ? <span className="old">{old}</span> : null}</div>;
}
