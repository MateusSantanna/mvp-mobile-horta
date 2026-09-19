/* Gerador de dados dos sensores.
   Simula um ciclo diário: a temperatura sobe até o meio da tarde, a umidade do solo
   cai enquanto o sol evapora a água e sobe de novo a cada irrigação.
   O mesmo modelo está em scripts/gerador_dados.py, que popula o banco de verdade. */
window.Horta = window.Horta || {};

Horta.gerador = (function () {
  var HORA = 3600000;

  function ruido(amplitude) {
    return (Math.random() - 0.5) * 2 * amplitude;
  }

  function temperaturaNaHora(hora) {
    // mínima ~18 °C às 5h, máxima ~31 °C às 15h
    return 24.5 + 6.5 * Math.cos(((hora - 15) / 24) * 2 * Math.PI) + ruido(0.8);
  }

  /* Gera uma série horária terminando em `fim` (padrão: agora). */
  function serie(dias, fim) {
    fim = fim || Date.now();
    var total = dias * 24;
    var leituras = [];
    var umidade = 62;
    var reservatorio = 88;

    for (var i = total - 1; i >= 0; i--) {
      var ts = fim - i * HORA;
      var d = new Date(ts);
      var hora = d.getHours();
      var temp = temperaturaNaHora(hora);

      // perda de água proporcional ao calor, maior durante o dia
      var evaporacao = (temp - 15) * 0.13 * (hora >= 7 && hora <= 18 ? 1 : 0.35);
      umidade -= evaporacao + ruido(0.4);

      // irrigação automática quando o solo seca abaixo de 32 %
      if (umidade < 32 && reservatorio > 4) {
        var volume = Math.min(30, reservatorio * 0.9);
        umidade += volume;
        reservatorio -= volume * 0.42;
      }

      // reposição manual do reservatório quando o nível fica crítico
      if (reservatorio < 8 && hora === 8) reservatorio = 100;

      umidade = Math.max(8, Math.min(95, umidade));
      reservatorio = Math.max(0, Math.min(100, reservatorio));

      leituras.push({
        ts: ts,
        temperatura: Math.round(temp * 10) / 10,
        umidade: Math.round(umidade * 10) / 10,
        reservatorio: Math.round(reservatorio)
      });
    }
    return leituras;
  }

  /* Próxima leitura a partir da última registrada — usado no modo tempo real. */
  function proxima(anterior) {
    var ts = Date.now();
    var hora = new Date(ts).getHours();
    var temp = temperaturaNaHora(hora);
    var base = anterior || { umidade: 55, reservatorio: 80 };
    var umidade = base.umidade - (temp - 15) * 0.05 + ruido(0.6);
    var reservatorio = base.reservatorio;

    if (umidade < 32 && reservatorio > 4) {
      var volume = Math.min(30, reservatorio * 0.9);
      umidade += volume;
      reservatorio -= volume * 0.42;
    }

    return {
      ts: ts,
      temperatura: Math.round(temp * 10) / 10,
      umidade: Math.round(Math.max(8, Math.min(95, umidade)) * 10) / 10,
      reservatorio: Math.round(Math.max(0, Math.min(100, reservatorio)))
    };
  }

  return { serie: serie, proxima: proxima };
})();
