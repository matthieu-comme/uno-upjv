const colorMap = {
  red:    "#e53935",
  blue:   "#1e88e5",
  green:  "#43a047",
  yellow: "#fdd835",
  wild:   "#111",
};

/** Retourne le chemin de l'image si elle existe, sinon null (fallback CSS). */
function cardImagePath(card, faceDown) {
  if (faceDown) return '/cards/back.png';
  if (!card) return null;
  const { color, value } = card;
  if (value === 'Wild')    return '/cards/wild.png';
  if (value === '+4')      return '/cards/wild-draw-four.png';
  if (value === '+2')      return `/cards/draw-two-${color}.png`;
  if (value === 'Skip')    return `/cards/skip-${color}.png`;
  if (value === 'Reverse') return `/cards/reverse-${color}.png`;
  // cartes numérotées (0-9)
  if (/^\d$/.test(value))  return `/cards/${value}-${color}.png`;
  return null;
}

import { useEffect, useState } from "react";

export default function Card({ card, faceDown = false, tintColor = null }) {
  const [imgError, setImgError] = useState(false);
  const rawPath = cardImagePath(card, faceDown);
  useEffect(() => { setImgError(false); }, [rawPath]);
  const imgPath = imgError ? null : rawPath;

  const base = faceDown ? "#111" : (colorMap[card?.color] ?? "#222");
  const bg = (!faceDown && tintColor && card?.color === "wild")
    ? `linear-gradient(145deg, ${tintColor} 0%, #111 70%)`
    : base;

  const isWildTinted = tintColor && card?.color === "wild" && !faceDown;

  return (
    <div
      style={{
        width: 78,
        height: 112,
        borderRadius: 14,
        border: isWildTinted
          ? `2px solid ${tintColor}99`
          : "2px solid rgba(255,255,255,0.22)",
        background: imgPath ? "transparent" : bg,
        color: "white",
        boxShadow: isWildTinted
          ? `0 10px 24px rgba(0,0,0,0.45), 0 0 16px ${tintColor}66`
          : "0 10px 24px rgba(0,0,0,0.45)",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        transition: "box-shadow 0.4s ease, border-color 0.4s ease",
      }}
      title={faceDown ? "Carte" : `${card?.color} ${card?.value}`}
    >
      {imgPath ? (
        /* ── Rendu image ── */
        <img
          src={imgPath}
          alt={faceDown ? "Carte" : `${card?.color} ${card?.value}`}
          style={{
            width: "100%",
            height: faceDown ? "110%" : "100%",
            objectFit: "cover",
            transform: faceDown ? "scale(1.10) translateY(0%)" : "scale(1)",
            borderRadius: 12,
            display: "block",
          }}
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        /* ── Rendu CSS (fallback numérotées) ── */
        <>
          <div style={{
            position: "absolute",
            inset: -18,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.16)",
            transform: "rotate(-18deg)",
          }} />
          <div style={{
            position: "relative",
            zIndex: 1,
            fontSize: 28,
            fontWeight: 900,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}>
            {card?.value}
          </div>
        </>
      )}
    </div>
  );
}
