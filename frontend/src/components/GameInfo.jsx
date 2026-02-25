export default function GameInfo({ currentPlayer, direction }) {
  return (
    <div>
      <p>Tour : {currentPlayer}</p>
      <p>Sens : {direction}</p>
    </div>
  );
}
