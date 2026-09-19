/* Telas, navegação e regras de apresentação. */
(function () {
  var dados = Horta.dados, gerador = Horta.gerador, grafico = Horta.grafico;
  var $ = function (id) { return document.getElementById(id); };
  var timerTempoReal = null;
  var diasPainel = 1;

  /* ---------- utilidades ---------- */
  function dataBR(ts) { return new Date(ts).toLocaleDateString('pt-BR'); }
  function horaBR(ts) { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function media(v) { return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : 0; }
  function isoData(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- navegação ---------- */
  function mostrar(tela) {
    ['inicio', 'registros', 'painel', 'perfil'].forEach(function (t) {
      $('tela-' + t).hidden = (t !== tela);
    });
    document.querySelectorAll('.abas button').forEach(function (b) {
      if (b.dataset.tela === tela) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (tela === 'registros') aplicarFiltro();
    if (tela === 'painel') montarPainel();
  }

  /* ---------- tela início ---------- */
  function montarInicio() {
    var ultima = dados.ultima();
    if (!ultima) {
      $('recado').textContent = 'Nenhuma leitura ainda. Toque em "Gerar 30 dias de dados" para começar.';
      $('tanque').innerHTML = grafico.reservatorio(0);
      return;
    }

    var limite = Number(dados.perfil().limite || 30);
    $('umidade-agora').innerHTML = ultima.umidade.toFixed(0) + '<small> % de umidade no solo</small>';
    $('temp-agora').textContent = ultima.temperatura.toFixed(1) + ' °C';
    $('tanque').innerHTML = grafico.reservatorio(ultima.reservatorio);
    $('atualizado').textContent = 'Atualizado às ' + horaBR(ultima.ts);

    var hoje = isoData(Date.now());
    var doDia = dados.listar().filter(function (l) { return isoData(l.ts) === hoje; });
    $('umid-media').textContent = doDia.length ? media(doDia.map(function (l) { return l.umidade; })).toFixed(0) + ' %' : '—';

    var classe, texto, recado;
    if (ultima.reservatorio < 20) {
      classe = 'critico'; texto = 'Reservatório quase vazio';
      recado = 'Reponha a água hoje: no ritmo atual de consumo o reservatório não cobre a próxima irrigação.';
    } else if (ultima.umidade < limite) {
      classe = 'atencao'; texto = 'Solo seco';
      recado = 'A umidade está abaixo do seu limite de ' + limite + ' %. A irrigação automática deve disparar em breve.';
    } else {
      classe = 'ok'; texto = 'Tudo em ordem';
      recado = 'Umidade acima do seu limite e água suficiente no reservatório.';
    }
    $('estado-solo').innerHTML = '<span class="selo ' + classe + '"><span class="ponto"></span>' + texto + '</span>';
    $('recado').textContent = recado;

    var ultimas24 = dados.listar().slice(-24);
    $('mini-grafico').innerHTML = grafico.linha([
      { valores: ultimas24.map(function (l) { return l.umidade; }), cor: 'var(--agua)' },
      { valores: ultimas24.map(function (l) { return l.temperatura; }), cor: 'var(--barro)' }
    ], ultimas24.map(function (l) { return horaBR(l.ts); }), 'últimas 24 horas');
  }

  /* ---------- tela registros ---------- */
  function preencherHoras() {
    var de = $('f-hora-de'), ate = $('f-hora-ate');
    for (var h = 0; h < 24; h++) {
      var rotulo = String(h).padStart(2, '0') + ':00';
      de.add(new Option(rotulo, h));
      ate.add(new Option(rotulo, h));
    }
    de.value = 0; ate.value = 23;
  }

  function aplicarFiltro() {
    var lista = dados.filtrar({
      de: $('f-de').value, ate: $('f-ate').value,
      horaDe: $('f-hora-de').value, horaAte: $('f-hora-ate').value
    }).slice().reverse();

    var corpo = $('corpo-tabela');
    corpo.innerHTML = '';
    if (!lista.length) {
      corpo.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum registro nesse intervalo. Amplie as datas ou o horário.</td></tr>';
      $('resumo-filtro').textContent = '0 registros';
      return;
    }

    var fragmento = document.createDocumentFragment();
    lista.slice(0, 500).forEach(function (l) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + dataBR(l.ts) + '</td><td>' + horaBR(l.ts) + '</td>' +
        '<td class="temp">' + l.temperatura.toFixed(1) + '</td>' +
        '<td class="umid">' + l.umidade.toFixed(1) + '</td>' +
        '<td>' + l.reservatorio + '</td>';
      fragmento.appendChild(tr);
    });
    corpo.appendChild(fragmento);

    $('resumo-filtro').textContent = lista.length + ' registro(s) • umidade média ' +
      media(lista.map(function (l) { return l.umidade; })).toFixed(1) + ' % • temperatura média ' +
      media(lista.map(function (l) { return l.temperatura; })).toFixed(1) + ' °C' +
      (lista.length > 500 ? ' (mostrando os 500 mais recentes)' : '');
  }

  /* ---------- tela painel ---------- */
  function indicador(titulo, valor, variacao, unidade) {
    var sinal = variacao > 0 ? '+' : '';
    return '<div class="cartao"><div class="subtexto">' + titulo + '</div>' +
      '<div class="valor">' + valor + '</div>' +
      '<div class="subtexto">' + sinal + variacao.toFixed(1) + ' ' + unidade + ' vs. período anterior</div></div>';
  }

  function montarPainel() {
    var todas = dados.listar();
    if (!todas.length) {
      $('indicadores').innerHTML = '<p class="vazio">Sem dados. Gere leituras na tela de início.</p>';
      $('grafico-umidade').innerHTML = ''; $('grafico-temperatura').innerHTML = '';
      return;
    }

    var pontos = diasPainel * 24;
    var atual = todas.slice(-pontos);
    var anterior = todas.slice(-pontos * 2, -pontos);

    var umidAtual = media(atual.map(function (l) { return l.umidade; }));
    var umidAnt = anterior.length ? media(anterior.map(function (l) { return l.umidade; })) : umidAtual;
    var tempAtual = media(atual.map(function (l) { return l.temperatura; }));
    var tempAnt = anterior.length ? media(anterior.map(function (l) { return l.temperatura; })) : tempAtual;

    $('indicadores').innerHTML =
      indicador('Umidade média', umidAtual.toFixed(1) + ' %', umidAtual - umidAnt, 'p.p.') +
      indicador('Temperatura média', tempAtual.toFixed(1) + ' °C', tempAtual - tempAnt, '°C') +
      '<div class="cartao"><div class="subtexto">Umidade mínima</div><div class="valor">' +
        Math.min.apply(null, atual.map(function (l) { return l.umidade; })).toFixed(1) + ' %</div>' +
        '<div class="subtexto">menor leitura do período</div></div>' +
      '<div class="cartao"><div class="subtexto">Reservatório</div><div class="valor">' +
        atual[atual.length - 1].reservatorio + ' %</div><div class="subtexto">nível atual</div></div>';

    var rotulos = atual.map(function (l) { return diasPainel === 1 ? horaBR(l.ts) : dataBR(l.ts).slice(0, 5); });

    $('grafico-umidade').innerHTML = grafico.linha([
      { valores: atual.map(function (l) { return l.umidade; }), cor: 'var(--agua)' },
      { valores: anterior.map(function (l) { return l.umidade; }), cor: 'var(--agua)', tracejado: true }
    ], rotulos, 'umidade');

    $('grafico-temperatura').innerHTML = grafico.linha([
      { valores: atual.map(function (l) { return l.temperatura; }), cor: 'var(--barro)' },
      { valores: anterior.map(function (l) { return l.temperatura; }), cor: 'var(--barro)', tracejado: true }
    ], rotulos, 'temperatura');
  }

  /* ---------- perfil ---------- */
  function carregarPerfil() {
    var p = dados.perfil();
    $('p-nome').value = p.nome || '';
    $('p-idade').value = p.idade || '';
    $('p-endereco').value = p.endereco || '';
    $('p-limite').value = p.limite || 30;
  }

  /* ---------- tempo real ---------- */
  function alternarTempoReal() {
    var botao = $('btn-tempo-real');
    if (timerTempoReal) {
      clearInterval(timerTempoReal); timerTempoReal = null;
      botao.textContent = 'Ligar tempo real';
      return;
    }
    timerTempoReal = setInterval(function () {
      dados.acrescentar(gerador.proxima(dados.ultima()));
      montarInicio();
      if (!$('tela-painel').hidden) montarPainel();
    }, 4000);
    botao.textContent = 'Pausar tempo real';
  }

  /* ---------- inicialização ---------- */
  function iniciar() {
    preencherHoras();

    if (!dados.listar().length) dados.salvarTodas(gerador.serie(30));

    var todas = dados.listar();
    $('f-de').value = isoData(todas[Math.max(0, todas.length - 24 * 7)].ts);
    $('f-ate').value = isoData(Date.now());

    document.querySelectorAll('.abas button').forEach(function (b) {
      b.addEventListener('click', function () { mostrar(b.dataset.tela); });
    });

    $('btn-filtrar').addEventListener('click', aplicarFiltro);
    $('btn-limpar-filtro').addEventListener('click', function () {
      $('f-de').value = ''; $('f-ate').value = '';
      $('f-hora-de').value = 0; $('f-hora-ate').value = 23;
      aplicarFiltro();
    });

    $('periodos').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      diasPainel = Number(b.dataset.dias);
      this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      montarPainel();
    });

    $('btn-gerar').addEventListener('click', function () {
      dados.salvarTodas(gerador.serie(30));
      montarInicio(); montarPainel();
    });
    $('btn-tempo-real').addEventListener('click', alternarTempoReal);

    $('btn-salvar-perfil').addEventListener('click', function () {
      var ok = dados.salvarPerfil({
        nome: $('p-nome').value.trim(),
        idade: $('p-idade').value,
        endereco: $('p-endereco').value.trim(),
        limite: Number($('p-limite').value) || 30
      });
      $('aviso-perfil').textContent = ok ? 'Perfil salvo neste aparelho.' : 'Não foi possível salvar: o armazenamento do navegador está bloqueado.';
      montarInicio();
    });

    $('btn-apagar-dados').addEventListener('click', function () {
      dados.limpar();
      $('aviso-perfil').textContent = 'Leituras apagadas. Gere novos dados na tela de início.';
      montarInicio(); aplicarFiltro(); montarPainel();
    });

    carregarPerfil();
    montarInicio();
    mostrar('inicio');
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
