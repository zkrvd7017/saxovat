export function CandyLogo({
  className = "",
  color = "currentColor",
  text = "Saxovat",
  hideText = false,
}: {
  className?: string;
  color?: string;
  text?: string;
  hideText?: boolean;
}) {
  return (
    <div className={`samarkand-logo ${className}`} style={color === "currentColor" ? undefined : { color }} aria-label={text}>
      <span className="samarkand-mark" aria-hidden="true">
        <span className="samarkand-flame">S</span>
      </span>
      {!hideText && (
        <span className="samarkand-wordmark">
          <span>{text}</span>
          <small>Premium restaurant</small>
        </span>
      )}
    </div>
  );
}
