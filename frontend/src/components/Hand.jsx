import Card from "./Card";

export default function Hand({ cards }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
      {cards.map((card, index) => (
        <Card key={index} card={card} onClick={() => console.log("Play:", card)} />
      ))}
    </div>
  );
}