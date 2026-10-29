// Reserva: se o compartilhamento chegar antes do service worker estar ativo, abre a tela Responder.
export default function handler(req, res) {
  res.statusCode = 303;
  res.setHeader("Location", "/?compartilhado=texto#responder");
  res.end();
}
