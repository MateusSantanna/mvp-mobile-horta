# Horta Inteligente — MVP Mobile (PWA)

App para acompanhar a umidade do solo, a temperatura e o nível do reservatório de água
de uma horta monitorada por sensores. Feito como PWA: roda no navegador, instala na tela
inicial do celular e funciona offline.

## Estrutura

```
horta/
├── index.html              casca do app e as quatro telas
├── manifest.json           nome, ícones e modo standalone (instalação)
├── service-worker.js       cache offline da casca; rede primeiro para /api/
├── css/
│   └── estilo.css          tokens de cor, tipografia, tema claro/escuro
├── js/
│   ├── dados.js            camada de dados (ler, gravar, filtrar, exportar CSV)
│   ├── gerador.js          simulação dos sensores no cliente (demonstração)
│   ├── grafico.js          gráficos em SVG, sem biblioteca externa
│   └── app.js              navegação, filtros, painel, tempo real
├── icons/                  ícones 192 e 512 px
├── scripts/
│   └── gerador_dados.py    gera a base de dados de verdade (SQLite + CSV/Excel)
└── dados/
    ├── horta.db            banco SQLite com as tabelas usuario e leitura
    └── leituras.csv        mesma base em CSV, abre no Excel
```

## Telas

| Tela | O que faz |
|---|---|
| Início | Nível do reservatório, umidade e temperatura atuais, alerta de reposição de água, gráfico das últimas 24 h e modo tempo real. |
| Registros | Tabela de leituras com filtro por data inicial/final e faixa de horário; resumo com médias do período filtrado. |
| Painel | Indicadores de 24 h / 7 dias / 30 dias comparados com o período anterior, gráficos de umidade e temperatura. |
| Perfil | Nome, idade, endereço e o limite de umidade que dispara o alerta. |

## Como rodar

O service worker exige um servidor (não funciona abrindo o arquivo direto):

```bash
cd horta
python3 -m http.server 8080
# abra http://localhost:8080 no celular ou no Chrome
```

No Chrome: menu → *Instalar app*. No iPhone, Safari → *Compartilhar* → *Adicionar à Tela de Início*.

## Base de dados

```bash
python3 scripts/gerador_dados.py --dias 30            # SQLite + CSV
python3 scripts/gerador_dados.py --dias 7 --excel     # também .xlsx (pip install openpyxl)
python3 scripts/gerador_dados.py --dias 30 --semente 7  # dados reproduzíveis
```

Esquema:

```sql
usuario(id, nome, idade, endereco)
leitura(id, data_hora, temperatura, umidade, reservatorio)
```

O modelo de simulação é o mesmo no Python e no `js/gerador.js`: temperatura mínima por volta
das 5 h e máxima às 15 h, evaporação proporcional ao calor, irrigação automática quando a
umidade cai abaixo de 32 % e reposição do reservatório quando o nível fica crítico.

## Ligando em uma API de verdade

Toda a leitura e escrita passa por `Horta.dados`, em `js/dados.js`. Para trocar o
armazenamento local por um backend, reimplemente `listar`, `acrescentar`, `filtrar`,
`perfil` e `salvarPerfil` com `fetch('/api/leituras')`. O service worker já trata
chamadas em `/api/` com estratégia rede primeiro, então nada mais precisa mudar.

## Próximos passos sugeridos

- Autenticação e perfil no servidor, em vez de armazenamento local.
- Recebimento das leituras reais do ESP32/Arduino via MQTT ou HTTP.
- Notificação push quando o reservatório chegar ao nível crítico.
- Exportar o período filtrado em CSV direto do app.
