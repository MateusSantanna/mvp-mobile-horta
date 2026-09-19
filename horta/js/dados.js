/* Camada de dados do app.
   Guarda leituras e perfil no armazenamento do próprio aparelho.
   Para trocar por uma API/banco remoto, basta reimplementar estas funções. */
window.Horta = window.Horta || {};

Horta.dados = (function () {
  var CHAVE_LEITURAS = 'horta:leituras';
  var CHAVE_PERFIL = 'horta:perfil';

  function ler(chave, padrao) {
    try {
      var bruto = localStorage.getItem(chave);
      return bruto ? JSON.parse(bruto) : padrao;
    } catch (e) {
      return padrao;
    }
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    /* leitura = { ts: epoch_ms, temperatura: °C, umidade: %, reservatorio: % } */
    listar: function () {
      return ler(CHAVE_LEITURAS, []);
    },
    salvarTodas: function (leituras) {
      return gravar(CHAVE_LEITURAS, leituras);
    },
    acrescentar: function (leitura) {
      var todas = this.listar();
      todas.push(leitura);
      // mantém no máximo 45 dias de leituras horárias
      if (todas.length > 1100) todas = todas.slice(todas.length - 1100);
      this.salvarTodas(todas);
      return leitura;
    },
    ultima: function () {
      var todas = this.listar();
      return todas.length ? todas[todas.length - 1] : null;
    },
    limpar: function () {
      this.salvarTodas([]);
    },
    perfil: function () {
      return ler(CHAVE_PERFIL, { nome: '', idade: '', endereco: '' });
    },
    salvarPerfil: function (perfil) {
      return gravar(CHAVE_PERFIL, perfil);
    },

    /* filtro por período e faixa de horário */
    filtrar: function (opcoes) {
      var de = opcoes.de ? new Date(opcoes.de + 'T00:00:00').getTime() : -Infinity;
      var ate = opcoes.ate ? new Date(opcoes.ate + 'T23:59:59').getTime() : Infinity;
      var horaDe = opcoes.horaDe !== '' && opcoes.horaDe != null ? Number(opcoes.horaDe) : 0;
      var horaAte = opcoes.horaAte !== '' && opcoes.horaAte != null ? Number(opcoes.horaAte) : 23;
      return this.listar().filter(function (l) {
        if (l.ts < de || l.ts > ate) return false;
        var h = new Date(l.ts).getHours();
        return h >= horaDe && h <= horaAte;
      });
    },

    paraCSV: function (leituras) {
      var linhas = ['data,hora,temperatura_c,umidade_pct,reservatorio_pct'];
      leituras.forEach(function (l) {
        var d = new Date(l.ts);
        linhas.push([
          d.toLocaleDateString('pt-BR'),
          d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          l.temperatura.toFixed(1),
          l.umidade.toFixed(1),
          l.reservatorio.toFixed(0)
        ].join(','));
      });
      return linhas.join('\n');
    }
  };
})();
