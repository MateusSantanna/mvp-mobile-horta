/* Gráfico de linha em SVG puro — sem biblioteca externa, para o app abrir offline. */
window.Horta = window.Horta || {};

Horta.grafico = (function () {
  var L = 34, R = 10, T = 12, B = 22, LARG = 340, ALT = 150;

  function caminho(valores, min, max) {
    if (valores.length < 2) return '';
    var faixa = (max - min) || 1;
    return valores.map(function (v, i) {
      var x = L + (i / (valores.length - 1)) * (LARG - L - R);
      var y = T + (1 - (v - min) / faixa) * (ALT - T - B);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }

  /* series: [{ valores, cor, tracejado }], rotulos: eixo X */
  function linha(series, rotulos, sufixo) {
    var todos = series.reduce(function (a, s) { return a.concat(s.valores); }, []);
    if (!todos.length) return '<p class="vazio">Sem dados no período escolhido.</p>';

    var min = Math.min.apply(null, todos);
    var max = Math.max.apply(null, todos);
    var folga = (max - min) * 0.15 || 1;
    min = Math.floor(min - folga);
    max = Math.ceil(max + folga);

    var grade = '', marcas = 4;
    for (var i = 0; i <= marcas; i++) {
      var y = T + (i / marcas) * (ALT - T - B);
      var v = max - (i / marcas) * (max - min);
      grade += '<line x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (LARG - R) + '" y2="' + y.toFixed(1) +
        '" stroke="var(--linha)" stroke-width="1"/>' +
        '<text x="' + (L - 6) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="9" fill="var(--tinta-suave)">' +
        Math.round(v) + '</text>';
    }

    var eixoX = '';
    var passos = Math.min(4, rotulos.length - 1);
    for (var j = 0; j <= passos; j++) {
      var idx = Math.round((j / passos) * (rotulos.length - 1));
      var x = L + (idx / (rotulos.length - 1 || 1)) * (LARG - L - R);
      eixoX += '<text x="' + x.toFixed(1) + '" y="' + (ALT - 6) + '" text-anchor="middle" font-size="9" fill="var(--tinta-suave)">' +
        rotulos[idx] + '</text>';
    }

    var linhas = series.map(function (s) {
      return '<path d="' + caminho(s.valores, min, max) + '" fill="none" stroke="' + s.cor +
        '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' +
        (s.tracejado ? ' stroke-dasharray="4 4" opacity=".65"' : '') + '/>';
    }).join('');

    return '<svg viewBox="0 0 ' + LARG + ' ' + ALT + '" role="img" aria-label="Gráfico de ' + (sufixo || 'leituras') + '">' +
      grade + eixoX + linhas + '</svg>';
  }

  /* Reservatório desenhado como um tanque que esvazia. */
  function reservatorio(pct) {
    var altura = 78 * (pct / 100);
    var cor = pct < 20 ? 'var(--barro)' : pct < 45 ? 'var(--seco)' : 'var(--agua)';
    return '<svg viewBox="0 0 76 104" role="img" aria-label="Reservatório em ' + pct + ' por cento">' +
      '<rect x="8" y="12" width="60" height="84" rx="8" fill="none" stroke="var(--linha)" stroke-width="2"/>' +
      '<rect x="11" y="' + (93 - altura).toFixed(1) + '" width="54" height="' + altura.toFixed(1) +
      '" rx="6" fill="' + cor + '" opacity=".85"/>' +
      '<rect x="24" y="4" width="28" height="9" rx="4" fill="var(--linha)"/>' +
      '<text x="38" y="58" text-anchor="middle" font-size="18" font-weight="600" fill="var(--painel)">' + pct + '%</text>' +
      '</svg>';
  }

  return { linha: linha, reservatorio: reservatorio };
})();
