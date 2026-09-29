# Horta Inteligente — MVP Mobile (PWA)

#### Integrantes da Equipe
* **Alexsandro Oliveira**
* **Mateus Santanna**
* **Pedro Henri**
* **Thiago Chagas**

#### Situação-Problema Escolhida
**Horta Inteligente**: Sistema de monitoramento de horta voltado para acompanhar os níveis de umidade do solo, temperatura ambiente e volume do reservatório de água, auxiliando na gestão da irrigação.

#### Descrição do MVP
O **Horta Inteligente** é uma Progressive Web Application (PWA) desenvolvida para permitir que o usuário monitore em tempo real e analise históricos ambientais da sua horta. A aplicação roda diretamente no navegador móvel, suporta instalação na tela inicial do smartphone e funciona completamente offline.

#### Tecnologias Utilizadas
* **Front-End:** HTML5, CSS3 (CSS Variables, Flexbox, Grid) e JavaScript Vanilla.
* **PWA & Offline:** Service Worker (`service-worker.js`) e Web App Manifest (`manifest.json`).
* **Visualização de Dados:** Gráficos e indicadores em SVG nativo.
* **Dados & Simulação:** `localStorage` (no cliente) e Python 3 com SQLite (`horta.db`) / CSV para geração e persistência de dados históricos.

#### Elementos Fora do Escopo (Limitações do MVP)
* Comunicação física via protocolo MQTT/HTTP direto com hardware (ESP32/Arduino).
* Autenticação de usuário com senha e controle de acesso via servidor remoto.
* Envio de notificações Push em segundo plano quando o aplicativo estiver fechado.

#### Estrutura do Projeto
```
horta/
├── index.html              # Interface e estrutura das 4 telas
├── manifest.json           # Configuração de PWA e instalação
├── service-worker.js       # Gerenciamento de cache offline
├── css/
│   └── estilo.css          # Estilização e temas
├── js/
│   ├── dados.js            # Camada de persistência local (localStorage)
│   ├── gerador.js          # Simulador de sensores no cliente
│   ├── grafico.js          # Renderizador de gráficos SVG
│   └── app.js              # Controlador e navegação
├── scripts/
│   └── gerador_dados.py    # Gerador de base SQLite e CSV em Python
└── dados/
    ├── horta.db            # Banco SQLite com leituras
    └── leituras.csv        # Histórico exportável em CSV
```

#### Telas

| Tela | O que faz |
|---|---|
| Início | Nível do reservatório, umidade e temperatura atuais, alerta de reposição de água, gráfico das últimas 24 h e modo tempo real. |
| Registros | Tabela de leituras com filtro por data inicial/final e faixa de horário; resumo com médias do período filtrado. |
| Painel | Indicadores de 24 h / 7 dias / 30 dias comparados com o período anterior, gráficos de umidade e temperatura. |
| Perfil | Nome, idade, endereço e o limite de umidade que dispara o alerta. |

#### Instruções de Instalação e Execução Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/MateusSantanna/mvp-mobile-horta.git
   cd mvp-mobile-horta\horta
   ```

2. **Gere a base de dados inicial (Opcional):**
   ```bash
   python scripts/gerador_dados.py --dias 30            # Gera SQLite (horta.db) e CSV (leituras.csv)
   python scripts/gerador_dados.py --dias 7 --excel     # Também gera arquivo .xlsx (requer: pip install openpyxl)
   python scripts/gerador_dados.py --dias 30 --semente 7  # Gera dados reproduzíveis com semente aleatória
   ```

**Esquema do Banco de Dados (`horta.db`):**
```sql
usuario(id, nome, idade, endereco)
leitura(id, data_hora, temperatura, umidade, reservatorio)
```

O modelo de simulação é o mesmo no Python e no `js/gerador.js`: temperatura mínima por volta
das 5 h e máxima às 15 h, evaporação proporcional ao calor, irrigação automática quando a
umidade cai abaixo de 32 % e reposição do reservatório quando o nível fica crítico.

3. **Inicie o servidor web local (necessário para o Service Worker):**
   ```bash
   python -m http.server 8080
   ```

4. **Acesse no navegador ou dispositivo móvel:**
   Abra `http://localhost:8080` no navegador.

#### Ligando em uma API de verdade

Toda a leitura e escrita passa por `Horta.dados`, em `js/dados.js`. Para trocar o
armazenamento local por um backend, reimplemente `listar`, `acrescentar`, `filtrar`,
`perfil` e `salvarPerfil` com `fetch('/api/leituras')`. O service worker já trata
chamadas em `/api/` com estratégia rede primeiro, então nada mais precisa mudar.
