const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (event) => {
   const data = JSON.parse(event.data);

   document.getElementById("a").innerText = `${data.A}%`;
   document.getElementById("b").innerText = `${data.B}%`;
   document.getElementById("c").innerText = `${data.C}%`;

   document.getElementById("barA").style.width = `${data.A}%`;
   document.getElementById("barB").style.width = `${data.B}%`;
   document.getElementById("barC").style.width = `${data.C}%`;
};

async function vote(option) {
   try {
      const res = await fetch(`/vote/${option}`, { method: "POST" });
      if (!res.ok) {
         const text = await res.text();
         alert(text);
      }
   } catch (err) {
      alert("Fehler beim Voten");
   }
}
