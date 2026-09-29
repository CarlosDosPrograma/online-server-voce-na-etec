(function(){
"use strict";

/* =========================================================================
   UTIL
========================================================================= */
function rand(min,max){ return Math.random()*(max-min)+min; }
function randInt(min,max){ return Math.floor(rand(min,max+1)); }
function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax); }

/* =========================================================================
   MULTIPLAYER (Socket.io)
========================================================================= */
const socket = io(); // Conecta com o backend (se rodando no mesmo host)
const outrosJogadores = {};

socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) {
            outrosJogadores[id] = players[id];
        }
    });
});

socket.on('newPlayer', (data) => {
    outrosJogadores[data.id] = data.player;
});

socket.on('playerMoved', (data) => {
    if(outrosJogadores[data.id]) {
        outrosJogadores[data.id].x = data.player.x;
        outrosJogadores[data.id].y = data.player.y;
        outrosJogadores[data.id].corCabeca = data.player.corCabeca;
    }
});

socket.on('playerDisconnect', (id) => {
    delete outrosJogadores[id];
});

/* =========================================================================
   PERSISTÊNCIA (localStorage) - nick, moedas, vitórias e armas compradas
========================================================================= */
const CHAVES = {
  vitorias: 'mundoInvertido_vitorias',
  moedas: 'mundoInvertido_moedas',
  nick: 'mundoInvertido_nick',
  armaEquipada: 'mundoInvertido_armaEquipada',
  armasCompradas: 'mundoInvertido_armasCompradas',
  personagemEquipado: 'mundoInvertido_personagemEquipado',
  personagensComprados: 'mundoInvertido_personagensComprados',
};

function obterNick(){
  const nick = localStorage.getItem(CHAVES.nick);
  return (nick && nick.trim()) ? nick.trim() : 'Jogador';
}
function salvarNick(nick){
  localStorage.setItem(CHAVES.nick, nick);
}
function obterVitorias(){
  return parseInt(localStorage.getItem(CHAVES.vitorias) || '0', 10);
}
function somarVitoria(){
  localStorage.setItem(CHAVES.vitorias, String(obterVitorias()+1));
}
function obterMoedas(){
  return parseInt(localStorage.getItem(CHAVES.moedas) || '0', 10);
}
function salvarMoedas(qtd){
  localStorage.setItem(CHAVES.moedas, String(Math.max(0, qtd)));
}
function obterArmasCompradas(){
  try{
    const dados = JSON.parse(localStorage.getItem(CHAVES.armasCompradas) || '[0]');
    if(!Array.isArray(dados)) return [0];
    if(!dados.includes(0)) dados.push(0);
    return dados;
  } catch(e){
    return [0];
  }
}
function salvarArmasCompradas(lista){
  localStorage.setItem(CHAVES.armasCompradas, JSON.stringify(lista));
}
function obterArmaEquipadaId(){
  return parseInt(localStorage.getItem(CHAVES.armaEquipada) || '0', 10);
}
function salvarArmaEquipadaId(id){
  localStorage.setItem(CHAVES.armaEquipada, String(id));
}
function obterPersonagensComprados(){
  try{
    const dados = JSON.parse(localStorage.getItem(CHAVES.personagensComprados) || '[0]');
    if(!Array.isArray(dados)) return [0];
    if(!dados.includes(0)) dados.push(0);
    return dados;
  } catch(e){
    return [0];
  }
}
function salvarPersonagensComprados(lista){
  localStorage.setItem(CHAVES.personagensComprados, JSON.stringify(lista));
}
function obterPersonagemEquipadoId(){
  return parseInt(localStorage.getItem(CHAVES.personagemEquipado) || '0', 10);
}
function salvarPersonagemEquipadoId(id){
  localStorage.setItem(CHAVES.personagemEquipado, String(id));
}

/* =========================================================================
   ARMAS (catálogo da loja)
========================================================================= */
const ARMAS = [
  { id:0, nome:'Pistola Padrão', preco:0,   dano:25, intervaloTiro:1500, municaoMax:6,   tempoRecarga:4000, perfuracoesMax:0, tamanhoArma:1.0,  icone:'pistola' },
  { id:1, nome:'Mini Uzi',       preco:15,  dano:15, intervaloTiro:1000, municaoMax:17,  tempoRecarga:5000, perfuracoesMax:0, tamanhoArma:0.62, icone:'uzi' },
  { id:2, nome:'AK-47',          preco:30,  dano:40, intervaloTiro:1000, municaoMax:20,  tempoRecarga:4500, perfuracoesMax:0, tamanhoArma:1.35, icone:'ak47' },
  { id:3, nome:'Sniper',         preco:45,  dano:70, intervaloTiro:1400, municaoMax:1,   tempoRecarga:2000, perfuracoesMax:3, tamanhoArma:1.6,  icone:'sniper' },
  { id:4, nome:'Minigun',        preco:100, dano:12, intervaloTiro:500,  municaoMax:100, tempoRecarga:3000, perfuracoesMax:0, tamanhoArma:1.8,  icone:'minigun' },
  { id:5, nome:'ULTIMATE',       preco:225, dano:50, intervaloTiro:500,  municaoMax:75,  tempoRecarga:5000, perfuracoesMax:2, tamanhoArma:1.4,  icone:'ultimate',
    habilidadeArma:{ id:'laser-arma', nome:'Feixe Laser', icone:'🔴',
      descricao:'Pressione E: dispara um feixe de laser contínuo por 4s, causando 45 de dano/seg. Recarga: 1min30s.',
      duracao:4000, danoPorSegundo:45, cooldown:90000, alcance:1100, largura:16 } },
];
function obterArmaPorId(id){
  return ARMAS.find(a=>a.id===id) || ARMAS[0];
}

/* =========================================================================
   PERSONAGENS (catálogo da loja) - cada um com uma cor e uma habilidade única
========================================================================= */
const PERSONAGENS = [
  { id:0, nome:'Fúria', preco:0, cor:'#39ff6a',
    habilidade:{ id:'rage', nome:'RAGE', icone:'🔥',
      descricao:'Com 25% de vida ou menos: +45% de dano e +50% de velocidade.',
      limiarVida:0.25, bonusDano:0.45, bonusVelocidade:0.5 } },
  { id:1, nome:'Bomba Rosa', preco:25, cor:'#ff5da2',
    habilidade:{ id:'atomico', nome:'ATÔMICO', icone:'💥',
      descricao:'Pressione F: causa uma explosão que mata todos os monstros do mapa, exceto o chefão. Recarga: 1min30s.',
      cooldown:90000 } },
  { id:2, nome:'Corrente Azul', preco:40, cor:'#4fc3ff',
    habilidade:{ id:'corrente-eletrica', nome:'Corrente Elétrica', icone:'⚡',
      descricao:'Pressione F para armar: o próximo tiro paralisa até 5 monstros por 4s, causando 25 de dano/seg. Recarga: 10s.',
      alvos:5, duracao:4000, danoPorSegundo:25, cooldown:10000 } },
  { id:3, nome:'Pesadelo Amarelo', preco:55, cor:'#ffe14d',
    habilidade:{ id:'pesadelo-vivo', nome:'PESADELO VIVO', icone:'👻',
      descricao:'Pressione F: invoca um pesadelo aliado que luta ao seu lado por 15s, perseguindo e atacando o inimigo mais próximo (14 de dano por golpe). Recarga: 40s.',
      duracao:15000, dano:14, intervaloAtaque:600, alcance:260, velocidade:190, cooldown:40000 } },
  { id:4, nome:'Sombra Roxa', preco:70, cor:'#a600ff',
    habilidade:{ id:'buraco-negro', nome:'Buraco Negro', icone:'🌀',
      descricao:'Pressione F: atira uma esfera negra gigante em linha reta, que dura 6s, causa 60 de dano/seg e puxa todos os monstros na direção dela. Recarga: 50s.',
      duracao:6000, danoPorSegundo:60, cooldown:50000, velocidade:260, raio:55 } },
];
function obterPersonagemPorId(id){
  return PERSONAGENS.find(p=>p.id===id) || PERSONAGENS[0];
}
function iconePersonagemSVG(cor){
  return `<svg viewBox="0 0 100 100" width="56" height="56">
    <circle cx="50" cy="50" r="34" fill="${cor}" stroke="#22131c" stroke-width="4"/>
    <circle cx="62" cy="50" r="4.5" fill="#0c0715"/>
  </svg>`;
}

function iconeArmaSVG(tipo){
  const cor = '#b9bcc4', contorno = '#4d4d55';
  switch(tipo){
    case 'pistola':
      return `<svg viewBox="0 0 100 50" width="80" height="40">
        <rect x="20" y="18" width="55" height="12" fill="${cor}" stroke="${contorno}"/>
        <rect x="30" y="28" width="12" height="18" fill="${cor}" stroke="${contorno}"/>
      </svg>`;
    case 'uzi':
      return `<svg viewBox="0 0 100 50" width="80" height="40">
        <rect x="15" y="20" width="45" height="10" fill="${cor}" stroke="${contorno}"/>
        <rect x="22" y="30" width="9" height="14" fill="${cor}" stroke="${contorno}"/>
        <rect x="55" y="15" width="10" height="20" fill="${cor}" stroke="${contorno}"/>
      </svg>`;
    case 'ak47':
      return `<svg viewBox="0 0 100 50" width="90" height="38">
        <rect x="8" y="20" width="78" height="9" fill="${cor}" stroke="${contorno}"/>
        <rect x="20" y="29" width="10" height="16" fill="${cor}" stroke="${contorno}"/>
        <path d="M28 29 q10 20 4 22 l-8 0 q-4 -14 0 -22 z" fill="#8a5a2b" stroke="${contorno}"/>
        <rect x="82" y="16" width="6" height="17" fill="${cor}" stroke="${contorno}"/>
      </svg>`;
    case 'sniper':
      return `<svg viewBox="0 0 120 50" width="100" height="34">
        <rect x="6" y="22" width="100" height="6" fill="${cor}" stroke="${contorno}"/>
        <rect x="30" y="14" width="26" height="6" fill="#2c2c33" stroke="${contorno}"/>
        <rect x="40" y="28" width="9" height="16" fill="${cor}" stroke="${contorno}"/>
      </svg>`;
    case 'minigun':
      return `<svg viewBox="0 0 100 60" width="80" height="48">
        <rect x="12" y="24" width="40" height="14" fill="${cor}" stroke="${contorno}"/>
        <circle cx="66" cy="31" r="14" fill="#2c2c33" stroke="${contorno}"/>
        <circle cx="66" cy="31" r="5" fill="${cor}"/>
        <rect x="26" y="38" width="10" height="16" fill="${cor}" stroke="${contorno}"/>
      </svg>`;
    case 'ultimate':
      return `<svg viewBox="0 0 110 55" width="90" height="42">
        <rect x="10" y="22" width="72" height="11" fill="${cor}" stroke="${contorno}"/>
        <rect x="26" y="32" width="11" height="17" fill="${cor}" stroke="${contorno}"/>
        <rect x="82" y="19" width="16" height="17" fill="#2c2c33" stroke="${contorno}"/>
        <circle cx="90" cy="27.5" r="4.5" fill="#ff2b4e" stroke="#ffb3c0">
          <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/>
        </circle>
        <rect x="8" y="25.5" width="6" height="4" fill="#ff2b4e"/>
      </svg>`;
    default:
      return '';
  }
}

/* =========================================================================
   FUNDO DE ESPOROS (LOBBY / CRÉDITOS / MENUS)
========================================================================= */
const sporeBg = document.getElementById('spore-bg');
for(let i=0;i<40;i++){
  const s = document.createElement('div');
  s.className='spore';
  s.style.left = rand(0,100)+'%';
  s.style.top = rand(0,100)+'%';
  s.style.animationDuration = rand(8,18)+'s';
  s.style.animationDelay = rand(0,10)+'s';
  sporeBg.appendChild(s);
}

/* =========================================================================
   NAVEGAÇÃO DE TELAS
========================================================================= */
const telas = {
  lobby: document.getElementById('tela-lobby'),
  creditos: document.getElementById('tela-creditos'),
  loja: document.getElementById('tela-loja'),
  personagens: document.getElementById('tela-personagens'),
  jogo: document.getElementById('tela-jogo'),
  levelup: document.getElementById('tela-levelup'),
  vitoria: document.getElementById('tela-vitoria'),
  derrota: document.getElementById('tela-derrota'),
  pause: document.getElementById('tela-pause'),
  estatisticas: document.getElementById('tela-estatisticas'),
};
function mostrarTela(nome){
  Object.values(telas).forEach(t=>t.classList.remove('active'));
  telas[nome].classList.add('active');
  if(nome === 'lobby'){
    atualizarWidgetsLobby();
  }
}

function atualizarWidgetsLobby(){
  document.getElementById('trofeu-contagem').textContent = obterVitorias();
  const inputNickEl = document.getElementById('input-nick');
  if(document.activeElement !== inputNickEl){
    inputNickEl.value = localStorage.getItem(CHAVES.nick) || '';
  }
}
// popula os widgets do lobby assim que a página carrega
atualizarWidgetsLobby();

const inputNickEl = document.getElementById('input-nick');
inputNickEl.addEventListener('input', ()=> salvarNick(inputNickEl.value));

document.getElementById('btn-jogar').addEventListener('click', ()=>{
  mostrarTela('jogo');
  iniciarNovoJogo('ondas');
});
document.getElementById('btn-infinito').addEventListener('click', ()=>{
  mostrarTela('jogo');
  iniciarNovoJogo('infinito');
});
document.getElementById('btn-creditos').addEventListener('click', ()=> mostrarTela('creditos'));
document.getElementById('btn-voltar-creditos').addEventListener('click', ()=> mostrarTela('lobby'));
document.getElementById('btn-vitoria-lobby').addEventListener('click', ()=>{ pararJogo(); mostrarTela('lobby'); });
document.getElementById('btn-derrota-lobby').addEventListener('click', ()=>{ pararJogo(); mostrarTela('lobby'); });
document.getElementById('btn-loja').addEventListener('click', ()=> abrirLoja());
document.getElementById('btn-voltar-loja').addEventListener('click', ()=> mostrarTela('lobby'));
document.getElementById('btn-personagens').addEventListener('click', ()=> abrirPersonagens());
document.getElementById('btn-voltar-personagens').addEventListener('click', ()=> mostrarTela('lobby'));

/* =========================================================================
   PAUSE E ESTATÍSTICAS
========================================================================= */
document.getElementById('btn-pause').addEventListener('click', ()=> abrirPause());
document.getElementById('btn-pause-continuar').addEventListener('click', ()=>{
  pausado = false;
  mostrarTela('jogo');
});
document.getElementById('btn-pause-estatisticas').addEventListener('click', ()=>{
  renderizarEstatisticas();
  mostrarTela('estatisticas');
});
document.getElementById('btn-estatisticas-voltar').addEventListener('click', ()=> mostrarTela('pause'));
document.getElementById('btn-pause-lobby').addEventListener('click', ()=>{
  pararJogo();
  pausado = false;
  mostrarTela('lobby');
});

function abrirPause(){
  if(!jogo || jogo.fimDeJogo || !telaAtivaEhJogo) return;
  // só pausa se estivermos de fato na tela do jogo (evita pausar durante o level-up, por exemplo)
  if(!telas.jogo.classList.contains('active')) return;
  pausado = true;
  mostrarTela('pause');
}

window.addEventListener('keydown', e=>{
  if(e.key !== 'Escape') return;
  if(!jogo || jogo.fimDeJogo || !telaAtivaEhJogo) return;
  if(telas.jogo.classList.contains('active')){
    abrirPause();
  } else if(telas.pause.classList.contains('active')){
    pausado = false;
    mostrarTela('jogo');
  }
});

function renderizarEstatisticas(){
  const cont = document.getElementById('lista-estatisticas');
  const vazioEl = document.getElementById('stats-vazio');
  cont.innerHTML = '';
  const contagem = (jogo && jogo.habilidadesContagem) ? jogo.habilidadesContagem : {};
  const chaves = Object.keys(contagem).filter(c=>contagem[c] > 0);
  if(chaves.length === 0){
    vazioEl.style.display = 'block';
    return;
  }
  vazioEl.style.display = 'none';
  chaves.forEach(chave=>{
    const h = HABILIDADES[chave];
    if(!h) return;
    const max = HABILIDADES_MAX[chave] || Infinity;
    const atual = contagem[chave];
    const noMax = atual >= max;
    const qtdTexto = (max === Infinity) ? ('x'+atual) : ('x'+atual+'/'+max);
    const linha = document.createElement('div');
    linha.className = 'stat-habilidade' + (noMax ? ' stat-maxada' : '');
    linha.innerHTML = `
      <div class="icone">${h.icone}</div>
      <div class="info">
        <div class="nome">${h.nome}</div>
      </div>
      ${noMax ? '<div class="stat-cadeado" title="Nível máximo atingido">🔒</div>' : ''}
      <div class="qtd">${qtdTexto}</div>
    `;
    cont.appendChild(linha);
  });
}

/* =========================================================================
   LOJA - compra e equipamento de armas
========================================================================= */
function abrirLoja(){
  document.getElementById('loja-moedas-valor').textContent = obterMoedas();
  renderizarItensLoja();
  mostrarTela('loja');
}

function renderizarItensLoja(){
  const cont = document.getElementById('loja-itens');
  cont.innerHTML = '';
  const compradas = obterArmasCompradas();
  const equipadaId = obterArmaEquipadaId();
  const moedas = obterMoedas();

  ARMAS.forEach(arma=>{
    const possuida = compradas.includes(arma.id);
    const equipada = arma.id === equipadaId;
    const div = document.createElement('div');
    div.className = 'item-loja' + (equipada ? ' equipada' : '');

    const cadenciaTexto = (arma.intervaloTiro/1000).toFixed(1).replace('.', ',') + 's';
    const recargaTexto = (arma.tempoRecarga/1000).toFixed(1).replace('.', ',') + 's';

    let botaoHTML;
    if(equipada){
      botaoHTML = `<button disabled>Equipada</button>`;
    } else if(possuida){
      botaoHTML = `<button class="equipar-btn" data-acao="equipar" data-id="${arma.id}">Equipar</button>`;
    } else {
      const podeComprar = moedas >= arma.preco;
      botaoHTML = `<button data-acao="comprar" data-id="${arma.id}" ${podeComprar?'':'disabled'}>Comprar (${arma.preco} 🪙)</button>`;
    }

    div.innerHTML = `
      <div class="icone-arma">${iconeArmaSVG(arma.icone)}</div>
      <h3>${arma.nome}</h3>
      <div class="preco">${arma.preco>0 ? arma.preco+' moedas' : 'Arma padrão'}</div>
      <div class="stats-arma">
        <div>Dano: <span>${arma.dano}</span></div>
        <div>Velocidade (cadência): <span>${cadenciaTexto}</span></div>
        <div>Munição: <span>${arma.municaoMax}</span></div>
        <div>Recarga: <span>${recargaTexto}</span></div>
        ${arma.perfuracoesMax>0 ? `<div>Perfuração: <span>${arma.perfuracoesMax} monstros</span></div>` : ''}
        ${arma.habilidadeArma ? `<div>Habilidade (E): <span>${arma.habilidadeArma.nome}</span></div>` : ''}
      </div>
      ${botaoHTML}
    `;
    cont.appendChild(div);
  });

  cont.querySelectorAll('button[data-acao]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = parseInt(btn.dataset.id, 10);
      if(btn.dataset.acao === 'comprar'){
        comprarArma(id);
      } else if(btn.dataset.acao === 'equipar'){
        equiparArma(id);
      }
    });
  });
}

function comprarArma(id){
  const arma = obterArmaPorId(id);
  const moedas = obterMoedas();
  if(moedas < arma.preco) return;
  salvarMoedas(moedas - arma.preco);
  const compradas = obterArmasCompradas();
  if(!compradas.includes(id)) compradas.push(id);
  salvarArmasCompradas(compradas);
  equiparArma(id);
}

function equiparArma(id){
  salvarArmaEquipadaId(id);
  document.getElementById('loja-moedas-valor').textContent = obterMoedas();
  renderizarItensLoja();
}

/* =========================================================================
   PERSONAGENS - compra e equipamento
========================================================================= */
function abrirPersonagens(){
  document.getElementById('personagens-moedas-valor').textContent = obterMoedas();
  renderizarItensPersonagens();
  mostrarTela('personagens');
}

function renderizarItensPersonagens(){
  const cont = document.getElementById('personagens-itens');
  cont.innerHTML = '';
  const compradas = obterPersonagensComprados();
  const equipadoId = obterPersonagemEquipadoId();
  const moedas = obterMoedas();

  PERSONAGENS.forEach(p=>{
    const possuido = compradas.includes(p.id);
    const equipado = p.id === equipadoId;
    const div = document.createElement('div');
    div.className = 'item-loja' + (equipado ? ' equipada' : '');

    let botaoHTML;
    if(equipado){
      botaoHTML = `<button disabled>Equipado</button>`;
    } else if(possuido){
      botaoHTML = `<button class="equipar-btn" data-acao="equipar-personagem" data-id="${p.id}">Equipar</button>`;
    } else {
      const podeComprar = moedas >= p.preco;
      botaoHTML = `<button data-acao="comprar-personagem" data-id="${p.id}" ${podeComprar?'':'disabled'}>Comprar (${p.preco} 🪙)</button>`;
    }

    div.innerHTML = `
      <div class="icone-personagem">${iconePersonagemSVG(p.cor)}</div>
      <h3>${p.nome}</h3>
      <div class="preco">${p.preco>0 ? p.preco+' moedas' : 'Personagem padrão'}</div>
      <div class="habilidade-tag${equipado ? ' habilidade-ativa' : ''}">
        <span class="icone-habilidade">${p.habilidade.icone}</span>
        <span>${p.habilidade.nome}</span>
      </div>
      <div class="stats-arma">${p.habilidade.descricao}</div>
      ${botaoHTML}
    `;
    cont.appendChild(div);
  });

  cont.querySelectorAll('button[data-acao]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = parseInt(btn.dataset.id, 10);
      if(btn.dataset.acao === 'comprar-personagem'){
        comprarPersonagem(id);
      } else if(btn.dataset.acao === 'equipar-personagem'){
        equiparPersonagem(id);
      }
    });
  });
}

function comprarPersonagem(id){
  const p = obterPersonagemPorId(id);
  const moedas = obterMoedas();
  if(moedas < p.preco) return;
  salvarMoedas(moedas - p.preco);
  const compradas = obterPersonagensComprados();
  if(!compradas.includes(id)) compradas.push(id);
  salvarPersonagensComprados(compradas);
  equiparPersonagem(id);
}

function equiparPersonagem(id){
  salvarPersonagemEquipadoId(id);
  document.getElementById('personagens-moedas-valor').textContent = obterMoedas();
  renderizarItensPersonagens();
}

/* =========================================================================
   CANVAS / CÂMERA
========================================================================= */
const canvas = document.getElementById('canvas-jogo');
const ctx = canvas.getContext('2d');
function ajustarCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', ajustarCanvas);
ajustarCanvas();

const MUNDO = { largura: 3200, altura: 3200 };

/* =========================================================================
   MAPA - FLORESTA DO MUNDO INVERTIDO (gerado uma vez)
========================================================================= */
let arvores = [];
let vinhas = [];
function gerarMapa(){
  arvores = [];
  vinhas = [];
  const nArvores = 220;
  for(let i=0;i<nArvores;i++){
    arvores.push({
      x: rand(60, MUNDO.largura-60),
      y: rand(60, MUNDO.altura-60),
      r: rand(18,34),
      tom: rand(0,1)
    });
  }
  const nVinhas = 80;
  for(let i=0;i<nVinhas;i++){
    vinhas.push({
      x: rand(0, MUNDO.largura),
      y: rand(0, MUNDO.altura),
      len: rand(20,60),
      ang: rand(0, Math.PI*2)
    });
  }
}

function desenharChao(camX, camY){
  // chão base
  ctx.fillStyle = '#170a1f';
  ctx.fillRect(0,0,visW, visH);

  // grid sutil do "mundo invertido"
  const tile = 80;
  const offX = -camX % tile;
  const offY = -camY % tile;
  ctx.strokeStyle = 'rgba(255,43,78,0.06)';
  ctx.lineWidth = 1;
  for(let x=offX; x<visW; x+=tile){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,visH); ctx.stroke();
  }
  for(let y=offY; y<visH; y+=tile){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(visW,y); ctx.stroke();
  }

  // névoa de manchas orgânicas
  ctx.fillStyle='rgba(122,17,64,0.06)';
  for(let i=0;i<6;i++){
    const mx = (i*677) % MUNDO.largura - camX;
    const my = (i*911) % MUNDO.altura - camY;
    ctx.beginPath();
    ctx.ellipse(mx,my, 220,150, i, 0, Math.PI*2);
    ctx.fill();
  }
}

function desenharVinhas(camX,camY){
  ctx.strokeStyle='rgba(255,93,162,0.25)';
  ctx.lineWidth=2;
  vinhas.forEach(v=>{
    const sx = v.x-camX, sy=v.y-camY;
    if(sx<-80||sx>visW+80||sy<-80||sy>visH+80) return;
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.lineTo(sx+Math.cos(v.ang)*v.len, sy+Math.sin(v.ang)*v.len);
    ctx.stroke();
  });
}

function desenharArvores(camX, camY, apenasSombra){
  arvores.forEach(a=>{
    const sx = a.x-camX, sy = a.y-camY;
    if(sx< -60 || sx>visW+60 || sy<-60 || sy>visH+60) return;
    if(apenasSombra){
      ctx.beginPath();
      ctx.ellipse(sx, sy+a.r*0.6, a.r*1.1, a.r*0.4, 0,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fill();
      return;
    }
    // tronco
    ctx.fillStyle = '#1c0f10';
    ctx.fillRect(sx-3, sy-2, 6, a.r*0.6);
    // copa (invertida = tons vermelho/roxo)
    const cor = a.tom>0.5 ? '#6b1030' : '#3d1450';
    ctx.beginPath();
    ctx.arc(sx, sy, a.r, 0, Math.PI*2);
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.strokeStyle='rgba(255,43,78,0.35)';
    ctx.lineWidth=1.5;
    ctx.stroke();
  });
}

/* =========================================================================
   ESTADO DO JOGO
========================================================================= */
let jogo = null; // objeto principal do estado da partida
let animId = null;
let ultimoTempo = 0;
let pausado = false;
let telaAtivaEhJogo = false;

// Zoom do campo de visão (controlado pelo scroll do mouse) - intervalo bem contido, pra não exagerar
let zoom = 1;
const ZOOM_MIN = 0.8;   // mais distante = enxerga mais
const ZOOM_MAX = 1.15;  // mais perto (padrão levemente acima de 1x)
const ZOOM_PASSO = 0.04;
let visW = canvas.width, visH = canvas.height; // dimensões visíveis do mundo, recalculadas a cada frame conforme o zoom

canvas.addEventListener('wheel', e=>{
  if(!telaAtivaEhJogo) return;
  e.preventDefault();
  zoom = clamp(zoom - Math.sign(e.deltaY) * ZOOM_PASSO, ZOOM_MIN, ZOOM_MAX);
}, { passive:false });

// limite máximo de vezes que cada habilidade pode ser escolhida; ausente/Infinity = sem limite
const HABILIDADES_MAX = {
  velocidade: 5,
  municaoExtra: 15,
};

const HABILIDADES = {
  velocidadeTiro: {
    nome: 'Recarga Rápida',
    icone: '⚡',
    desc: 'Reduz o tempo de recarga da munição em 0,2s.',
  },
  velocidadeTiro2: {
    nome: 'Gatilho Ligeiro',
    icone: '🔫',
    desc: 'Reduz o intervalo entre tiros em 0,2s.',
  },
  velocidade: {
    nome: 'Pés Ligeiros',
    icone: '🏃',
    desc: 'Aumenta sua velocidade de movimento em 2 pontos.',
  },
  dano: {
    nome: 'Munição Perfurante',
    icone: '💥',
    desc: 'Aumenta o dano de cada tiro em 1,2.',
  },
  perfuracao: {
    nome: 'Perfuração',
    icone: '🎯',
    desc: 'Chance de o tiro atravessar o inimigo e atingir o de trás (+5%).',
  },
  vampiro: {
    nome: 'Sanguessuga',
    icone: '🩸',
    desc: 'Recupera 1 de vida a cada tiro disparado.',
  },
  municaoExtra: {
    nome: 'Pente Estendido',
    icone: '🧰',
    desc: 'Aumenta a munição máxima do carregador em +1.',
  },
  vidaExtra: {
    nome: 'Colete Reforçado',
    icone: '❤️',
    desc: 'Aumenta sua vida máxima em +15.',
  }
};

function criarJogador(){
  const arma = obterArmaPorId(obterArmaEquipadaId());
  const personagem = obterPersonagemPorId(obterPersonagemEquipadoId());
  return {
    x: MUNDO.largura/2,
    y: MUNDO.altura/2,
    raio: 15,
    corCabeca: personagem.cor,
    personagemId: personagem.id,
    personagem: personagem,
    habilidadeAtiva: false,
    correntePronta: false,
    correnteCooldownRestante: 0,
    buracoNegroCooldownRestante: 0,
    atomicoCooldownRestante: 0,
    pesadeloVivoCooldownRestante: 0,
    vida: 100,
    vidaMax: 100,
    nivel: 1,
    xp: 0,
    xpParaProximo: 100,
    // stats base
    velocidadeStat: 5,     // "unidade" de velocidade pedida no spec (max 50)
    dano: arma.dano,
    intervaloTiro: arma.intervaloTiro,
    chancePerfuracao: 0,   // 0 a 1 (bônus de habilidade, além da perfuração da arma)
    vampiroPorTiro: 0,
    // munição
    municaoMax: arma.municaoMax,
    municao: arma.municaoMax,
    recarregando: false,
    tempoRecarga: arma.tempoRecarga,
    recargaAtual: 0,
    // tiro
    ultimoTiro: -99999,
    // mira
    miraAngulo: 0,
    atirando:false,
    // arma equipada
    armaId: arma.id,
    perfuracoesArma: arma.perfuracoesMax,
    tamanhoArma: arma.tamanhoArma,
    // habilidade ativa da arma (ex: ULTIMATE - Feixe Laser, tecla E)
    habilidadeArma: arma.habilidadeArma || null,
    laserArmaCooldownRestante: 0,
    laserArmaDuracaoRestante: 0,
    laserArmaAngulo: 0,
  };
}

function velocidadeReal(j){
  // transforma o "stat" de velocidade em px/s de movimento
  let vel = 60 + j.velocidadeStat * 26; // base ~190 px/s no stat inicial 5
  if(j.habilidadeAtiva && j.personagem && j.personagem.habilidade.bonusVelocidade){
    vel *= (1 + j.personagem.habilidade.bonusVelocidade);
  }
  return vel;
}

// Verifica e atualiza o estado das habilidades passivas/condicionais do personagem (ex: RAGE)
function atualizarHabilidadePersonagem(j){
  const hab = j.personagem && j.personagem.habilidade;
  if(hab && hab.id === 'rage'){
    j.habilidadeAtiva = (j.vida <= j.vidaMax * hab.limiarVida);
  } else {
    j.habilidadeAtiva = false;
  }
}

/* Configuração das ondas: onda1=10, +15 a cada onda; a 10ª onda é o chefão (contagem=1) */
const CONFIG_ONDAS = [10,25,40,55,70,85,100,115,130,1];
const ONDA_CHEFAO_INDEX = CONFIG_ONDAS.length-1; // índice 9 = onda 10

// tipos de inimigo
// vida calculada para morrer com um número exato de tiros da arma inicial (Pistola Padrão, dano 25):
// básico = 3 tiros (75), médio = 5 tiros (125), difícil = 7 tiros (175), pesadelo = 10 tiros (250)
const TIPOS_INIMIGO = {
  basico:   { hp:75,  dano:10, velocidade:130, raio:15, cor:'#ff2b4e', prob:0.52, xp:5 },
  medio:    { hp:125, dano:18, velocidade:155, raio:20, cor:'#ff5d3a', prob:0.25, xp:5 },
  dificil:  { hp:175, dano:35, velocidade:200, raio:32, cor:'#b3001b', prob:0.15, xp:5 },
  pesadelo: { hp:250, dano:45, velocidade:270, raio:36, cor:'#a600ff', prob:0.08, xp:5,
              alcanceDisparo:460, tempoCarga:2000, cooldownPosDisparo:1300, danoLaser:80 },
};

// configuração do chefão (onda 10)
const CHEFAO_CONFIG = {
  hpMax: 1800,
  raio: 110,
  velocidade: 80,
  danoSimples: 140,      // ataque de perto (área pequena) — MUITO mais alto
  danoOndaChoque: 120,   // carrega 3s, área grande — MUITO mais alto
  danoTentaculo: 130,    // gira o braço-tentáculo, área bem grande — MUITO mais alto
  intervaloInvocar: 8000, // invoca a cada 8 segundos, timer independente
};

function sortearTipoInimigo(ondaIndex){
  // no modo infinito, usa sempre a mistura completa
  let opcoes;
  if(jogo && jogo.modo === 'infinito'){
    opcoes = ['basico','medio','dificil','pesadelo'];
  } else if(ondaIndex <= 1){
    // ondas 1-2: só básico
    opcoes = ['basico'];
  } else if(ondaIndex <= 3){
    // ondas 3-4: básico + médio (médio passa a aparecer a partir da onda 3)
    opcoes = ['basico','medio'];
  } else if(ondaIndex <= 5){
    // ondas 5-6: básico + médio + difícil (difícil passa a aparecer a partir da onda 5)
    opcoes = ['basico','medio','dificil'];
  } else {
    // ondas 7+: básico + médio + difícil + pesadelo (pesadelo passa a aparecer a partir da onda 7)
    opcoes = ['basico','medio','dificil','pesadelo'];
  }
  const pesos = opcoes.map(o=>TIPOS_INIMIGO[o].prob);
  const soma = pesos.reduce((a,b)=>a+b,0);
  let r = Math.random()*soma;
  for(let i=0;i<opcoes.length;i++){
    if(r < pesos[i]) return opcoes[i];
    r -= pesos[i];
  }
  return opcoes[opcoes.length-1];
}

function criarInimigo(tipoNome, x, y){
  const t = TIPOS_INIMIGO[tipoNome];
  const ondaIndex = (jogo && typeof jogo.ondaIndex === 'number') ? jogo.ondaIndex : 0;
  const bonusDanoPorOnda = ondaIndex * 10; // +10 de dano por onda, para cada inimigo
  const bonusVelPorOnda = ondaIndex * 4;   // aumento razoável de velocidade por onda
  const inimigo = {
    tipo: tipoNome,
    x, y,
    raio: t.raio,
    hpMax: t.hp,
    hp: t.hp,
    dano: t.dano + bonusDanoPorOnda,
    velocidade: t.velocidade + bonusVelPorOnda,
    cor: t.cor,
    angulo: 0,
    estado: 'perseguindo', // perseguindo | abrindo | atacando | recuo  (pesadelo usa: perseguindo | carregando | recuo)
    tempoEstado: 0,
    vivo:true,
  };
  if(tipoNome === 'pesadelo'){
    inimigo.alcanceDisparo = t.alcanceDisparo;
    inimigo.tempoCarga = t.tempoCarga;
    inimigo.cooldownPosDisparo = t.cooldownPosDisparo;
    inimigo.danoLaser = t.danoLaser;
    inimigo.disparoFeito = false;
  }
  return inimigo;
}

function criarChefao(x,y){
  return {
    tipo: 'chefao',
    x, y,
    raio: CHEFAO_CONFIG.raio,
    hpMax: CHEFAO_CONFIG.hpMax,
    hp: CHEFAO_CONFIG.hpMax,
    velocidade: CHEFAO_CONFIG.velocidade,
    cor: '#8f0022',
    angulo: 0,
    vivo: true,
    estadoAtaque: 'nenhum', // nenhum | telegraph | executando | recuo
    ataqueAtual: null,
    tempoEstado: 0,
    cooldownAtaque: 1500,
    telegraphAlvo: null,
    invocarTimer: 0,
    invocarPendente: false,
    animTempo: 0,
  };
}

function atualizarChefao(chefao, dt){
  const j = jogo.jogador;
  const d = dist(chefao.x, chefao.y, j.x, j.y);
  chefao.angulo = angleTo(chefao.x, chefao.y, j.x, j.y);
  chefao.animTempo += dt;

  // temporizador independente da invocação: dispara a cada 8 segundos
  chefao.invocarTimer += dt;
  if(chefao.invocarTimer >= CHEFAO_CONFIG.intervaloInvocar){
    chefao.invocarPendente = true;
  }

  if(chefao.estadoAtaque === 'nenhum'){
    if(d > 90){
      const vel = chefao.velocidade * (dt/1000);
      chefao.x += Math.cos(chefao.angulo)*vel;
      chefao.y += Math.sin(chefao.angulo)*vel;
    }
    if(chefao.invocarPendente){
      chefao.invocarPendente = false;
      chefao.invocarTimer = 0;
      iniciarAtaqueChefao(chefao, 'invocar');
    } else {
      chefao.cooldownAtaque -= dt;
      if(chefao.cooldownAtaque <= 0){
        escolherAtaqueChefao(chefao, d);
      }
    }
  } else if(chefao.estadoAtaque === 'telegraph'){
    chefao.tempoEstado += dt;
    if(chefao.tempoEstado >= chefao.telegraphAlvo.duracao){
      executarAtaqueChefao(chefao);
      chefao.estadoAtaque = 'executando';
      chefao.tempoEstado = 0;
    }
  } else if(chefao.estadoAtaque === 'executando'){
    chefao.tempoEstado += dt;
    if(chefao.tempoEstado >= 280){
      chefao.estadoAtaque = 'recuo';
      chefao.tempoEstado = 0;
      chefao.telegraphAlvo = null;
    }
  } else if(chefao.estadoAtaque === 'recuo'){
    chefao.tempoEstado += dt;
    if(chefao.tempoEstado >= 800){
      chefao.estadoAtaque = 'nenhum';
      chefao.tempoEstado = 0;
      chefao.cooldownAtaque = rand(1800, 2800);
      chefao.ataqueAtual = null;
    }
  }
}

function escolherAtaqueChefao(chefao, distanciaAtual){
  // as 3 habilidades restantes (a invocação tem timer próprio de 8s)
  let opcoes;
  if(distanciaAtual > 260){
    opcoes = ['ondaChoque']; // ataque de longa distância
  } else {
    opcoes = ['simples','tentaculo']; // ataques de curta distância
  }
  const tipo = opcoes[randInt(0, opcoes.length-1)];
  iniciarAtaqueChefao(chefao, tipo);
}

function iniciarAtaqueChefao(chefao, tipo){
  const j = jogo.jogador;
  chefao.ataqueAtual = tipo;
  chefao.estadoAtaque = 'telegraph';
  chefao.tempoEstado = 0;

  if(tipo === 'invocar'){
    // calcula os pontos de nascimento agora e mostra uma "?" sobre cada um antes de nascerem
    const pontos = [];
    for(let i=0;i<4;i++){
      const ang = (Math.PI*2/4)*i + rand(-0.3,0.3);
      pontos.push({
        x: clamp(chefao.x + Math.cos(ang)*90, 30, MUNDO.largura-30),
        y: clamp(chefao.y + Math.sin(ang)*90, 30, MUNDO.altura-30),
      });
    }
    chefao.telegraphAlvo = { tipo:'invocacao', pontos, duracao: 1000 };
  } else if(tipo === 'ondaChoque'){
    // carrega por 3 segundos e ataca uma área grande
    chefao.telegraphAlvo = { tipo:'circulo', raio: 230, duracao: 3000, cor:'#ff5da2' };
  } else if(tipo === 'simples'){
    // ataque de perto, só acerta quando o jogador está bem próximo
    chefao.telegraphAlvo = { tipo:'circulo', raio: chefao.raio+55, duracao: 650, cor:'#ff2b4e' };
  } else if(tipo === 'tentaculo'){
    // gira o braço-tentáculo ao redor, demora 2s para atacar, área bem grande
    chefao.telegraphAlvo = { tipo:'tentaculo', raio: 190, duracao: 2000, cor:'#a3132f' };
  }
}

function executarAtaqueChefao(chefao){
  const j = jogo.jogador;
  if(chefao.ataqueAtual === 'invocar'){
    // nasce exatamente nos pontos marcados com "?"
    chefao.telegraphAlvo.pontos.forEach(p=>{
      jogo.inimigos.push(criarInimigo('basico', p.x, p.y));
    });
  } else if(chefao.ataqueAtual === 'ondaChoque'){
    if(dist(chefao.x,chefao.y,j.x,j.y) < chefao.telegraphAlvo.raio){
      j.vida = clamp(j.vida - CHEFAO_CONFIG.danoOndaChoque, 0, j.vidaMax);
    }
  } else if(chefao.ataqueAtual === 'simples'){
    if(dist(chefao.x,chefao.y,j.x,j.y) < chefao.telegraphAlvo.raio){
      j.vida = clamp(j.vida - CHEFAO_CONFIG.danoSimples, 0, j.vidaMax);
    }
  } else if(chefao.ataqueAtual === 'tentaculo'){
    if(dist(chefao.x,chefao.y,j.x,j.y) < chefao.telegraphAlvo.raio){
      j.vida = clamp(j.vida - CHEFAO_CONFIG.danoTentaculo, 0, j.vidaMax);
    }
  }
}

function iniciarNovoJogo(modo){
  modo = modo || 'ondas';
  gerarMapa();
  zoom = 1;
  jogo = {
    jogador: criarJogador(),
    inimigos: [],
    projeteis: [],
    projeteisInimigos: [],
    buracosNegros: [],
    aliados: [],
    flashAtomicoRestante: 0,
    orbs: [],
    particulas: [],
    moedasChao: [],
    popupsMoedas: [],
    modo: modo,
    ondaIndex: 0,
    inimigosParaSpawnar: modo==='infinito' ? Infinity : CONFIG_ONDAS[0],
    inimigosSpawnados: 0,
    inimigosMortosNaOnda: 0,
    tempoDesdeUltimoSpawn: 0,
    intervaloSpawn: 3500,
    tempoDesdeUltimoOrb: 0,
    inimigosMortosTotal: 0,
    tempoDeJogo: 0,
    ondaEmAndamento: true,
    fimDeJogo:false,
    habilidadesContagem: {},
  };
  atualizarHUD();
  mostrarAvisoOnda(modo==='infinito' ? 'Modo Infinito' : 'Onda 1');
  ultimoTempo = performance.now();
  pausado = false;
  telaAtivaEhJogo = true;
  if(animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function pararJogo(){
  telaAtivaEhJogo = false;
  if(animId) cancelAnimationFrame(animId);
  animId = null;
}

/* =========================================================================
   ENTRADA - TECLADO E MOUSE
========================================================================= */
const teclas = {};
window.addEventListener('keydown', e=>{ teclas[e.key.toLowerCase()]=true; });
window.addEventListener('keyup', e=>{ teclas[e.key.toLowerCase()]=false; });

// Habilidade "Corrente Elétrica" (Corrente Azul): tecla F arma o próximo tiro
window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.key.toLowerCase() !== 'f') return;
  if(!jogo || jogo.fimDeJogo || pausado || !telaAtivaEhJogo) return;
  if(!telas.jogo.classList.contains('active')) return;
  const j = jogo.jogador;
  const hab = j.personagem && j.personagem.habilidade;
  if(!hab || hab.id !== 'corrente-eletrica') return;
  if(j.correntePronta || j.correnteCooldownRestante > 0) return; // já armada ou em recarga
  j.correntePronta = true;
});

// Habilidade "Buraco Negro" (Sombra Roxa): tecla F dispara na hora, em linha reta
window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.key.toLowerCase() !== 'f') return;
  if(!jogo || jogo.fimDeJogo || pausado || !telaAtivaEhJogo) return;
  if(!telas.jogo.classList.contains('active')) return;
  const j = jogo.jogador;
  const hab = j.personagem && j.personagem.habilidade;
  if(!hab || hab.id !== 'buraco-negro') return;
  if(j.buracoNegroCooldownRestante > 0) return; // em recarga
  dispararBuracoNegro(j, hab);
  j.buracoNegroCooldownRestante = hab.cooldown || 50000;
});

// Habilidade "ATÔMICO" (Bomba Rosa): tecla F mata todos os monstros do mapa, exceto o chefão
window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.key.toLowerCase() !== 'f') return;
  if(!jogo || jogo.fimDeJogo || pausado || !telaAtivaEhJogo) return;
  if(!telas.jogo.classList.contains('active')) return;
  const j = jogo.jogador;
  const hab = j.personagem && j.personagem.habilidade;
  if(!hab || hab.id !== 'atomico') return;
  if(j.atomicoCooldownRestante > 0) return; // em recarga
  dispararAtomico(j, hab);
  j.atomicoCooldownRestante = hab.cooldown || 90000;
});

// Habilidade "PESADELO VIVO" (Pesadelo Amarelo): tecla F invoca um aliado temporário
window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.key.toLowerCase() !== 'f') return;
  if(!jogo || jogo.fimDeJogo || pausado || !telaAtivaEhJogo) return;
  if(!telas.jogo.classList.contains('active')) return;
  const j = jogo.jogador;
  const hab = j.personagem && j.personagem.habilidade;
  if(!hab || hab.id !== 'pesadelo-vivo') return;
  if(j.pesadeloVivoCooldownRestante > 0) return; // em recarga
  invocarPesadeloVivo(j, hab);
  j.pesadeloVivoCooldownRestante = hab.cooldown || 40000;
});

// Habilidade "Feixe Laser" (arma ULTIMATE): tecla E dispara um feixe contínuo por 4s
window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.key.toLowerCase() !== 'e') return;
  if(!jogo || jogo.fimDeJogo || pausado || !telaAtivaEhJogo) return;
  if(!telas.jogo.classList.contains('active')) return;
  const j = jogo.jogador;
  const hab = j.habilidadeArma;
  if(!hab || hab.id !== 'laser-arma') return;
  if(j.laserArmaCooldownRestante > 0 || j.laserArmaDuracaoRestante > 0) return; // em recarga ou já ativo
  j.laserArmaDuracaoRestante = hab.duracao;
  j.laserArmaCooldownRestante = hab.cooldown || 90000;
});

let mouseX = 0, mouseY = 0, mouseDown=false;
canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX-rect.left;
  mouseY = e.clientY-rect.top;
});
canvas.addEventListener('mousedown', ()=> mouseDown=true);
window.addEventListener('mouseup', ()=> mouseDown=false);

/* =========================================================================
   LOOP PRINCIPAL
========================================================================= */
function loop(timestamp){
  if(!telaAtivaEhJogo) return;
  const dt = Math.min(50, timestamp-ultimoTempo); // ms, clamp p/ evitar saltos
  ultimoTempo = timestamp;

  if(!pausado && jogo && !jogo.fimDeJogo){
    atualizar(dt);
  }
  desenhar();

  animId = requestAnimationFrame(loop);
}

/* =========================================================================
   ATUALIZAÇÃO
========================================================================= */
function atualizar(dt){
  const j = jogo.jogador;
  jogo.tempoDeJogo += dt;

  /* ---- Habilidade do personagem (ex: RAGE) ---- */
  atualizarHabilidadePersonagem(j);
  if(j.correnteCooldownRestante > 0){
    j.correnteCooldownRestante = Math.max(0, j.correnteCooldownRestante - dt);
  }
  if(j.buracoNegroCooldownRestante > 0){
    j.buracoNegroCooldownRestante = Math.max(0, j.buracoNegroCooldownRestante - dt);
  }
  if(j.atomicoCooldownRestante > 0){
    j.atomicoCooldownRestante = Math.max(0, j.atomicoCooldownRestante - dt);
  }
  if(j.pesadeloVivoCooldownRestante > 0){
    j.pesadeloVivoCooldownRestante = Math.max(0, j.pesadeloVivoCooldownRestante - dt);
  }
  if(jogo.flashAtomicoRestante > 0){
    jogo.flashAtomicoRestante = Math.max(0, jogo.flashAtomicoRestante - dt);
  }
  if(j.laserArmaCooldownRestante > 0){
    j.laserArmaCooldownRestante = Math.max(0, j.laserArmaCooldownRestante - dt);
  }
  if(j.laserArmaDuracaoRestante > 0){
    j.laserArmaAngulo = j.miraAngulo; // o feixe acompanha a mira enquanto ativo
    aplicarDanoFeixeLaser(j, dt);
    j.laserArmaDuracaoRestante = Math.max(0, j.laserArmaDuracaoRestante - dt);
  }

  /* ---- Buracos negros (Sombra Roxa): movem em linha reta e expiram ---- */
  jogo.buracosNegros.forEach(bn=>{
    bn.x += bn.vx * (dt/1000);
    bn.y += bn.vy * (dt/1000);
    bn.duracaoRestante -= dt;
    bn.anguloGiro += dt/180;
  });
  jogo.buracosNegros = jogo.buracosNegros.filter(bn=> bn.duracaoRestante > 0);

  /* ---- Aliados invocados (Pesadelo Vivo): perseguem e atacam o inimigo mais próximo ---- */
  jogo.aliados.forEach(aliado=>{
    aliado.duracaoRestante -= dt;
    if(aliado.flashAtaque > 0) aliado.flashAtaque -= dt;

    // acha o inimigo vivo mais próximo
    let alvo = null, melhorD = Infinity;
    jogo.inimigos.forEach(inimigo=>{
      if(!inimigo.vivo) return;
      const d = dist(aliado.x, aliado.y, inimigo.x, inimigo.y);
      if(d < melhorD){ melhorD = d; alvo = inimigo; }
    });

    if(alvo){
      aliado.angulo = angleTo(aliado.x, aliado.y, alvo.x, alvo.y);
      if(melhorD > aliado.alcance){
        // persegue o alvo
        const vel = aliado.velocidade * (dt/1000);
        aliado.x += Math.cos(aliado.angulo)*vel;
        aliado.y += Math.sin(aliado.angulo)*vel;
      } else if(jogo.tempoDeJogo - aliado.ultimoAtaque >= aliado.intervaloAtaque){
        alvo.hp -= aliado.dano;
        aliado.ultimoAtaque = jogo.tempoDeJogo;
        aliado.flashAtaque = 150;
        aliado.alvoX = alvo.x; aliado.alvoY = alvo.y;
        criarParticulasImpacto(alvo.x, alvo.y);
        if(alvo.hp <= 0) matarInimigo(alvo);
      }
    } else {
      // sem inimigos por perto: acompanha o jogador
      const dJogador = dist(aliado.x, aliado.y, j.x, j.y);
      if(dJogador > 70){
        const angJ = angleTo(aliado.x, aliado.y, j.x, j.y);
        aliado.angulo = angJ;
        const vel = aliado.velocidade * (dt/1000);
        aliado.x += Math.cos(angJ)*vel;
        aliado.y += Math.sin(angJ)*vel;
      }
    }
  });
  jogo.aliados = jogo.aliados.filter(a=> a.duracaoRestante > 0);

  /* ---- Movimento do jogador ---- */
  let mx=0, my=0;
  if(teclas['w']||teclas['arrowup']) my-=1;
  if(teclas['s']||teclas['arrowdown']) my+=1;
  if(teclas['a']||teclas['arrowleft']) mx-=1;
  if(teclas['d']||teclas['arrowright']) mx+=1;
  if(mx!==0||my!==0){
    const len = Math.hypot(mx,my);
    mx/=len; my/=len;
    const vel = velocidadeReal(j) * (dt/1000);
    j.x = clamp(j.x + mx*vel, j.raio, MUNDO.largura-j.raio);
    j.y = clamp(j.y + my*vel, j.raio, MUNDO.altura-j.raio);
    socket.emit('playerMovement', { x: j.x, y: j.y, corCabeca: j.corCabeca });
  }

  /* ---- Mira ---- */
  const camX = j.x - canvas.width/2;
  const camY = j.y - canvas.height/2;
  j.miraAngulo = angleTo(canvas.width/2, canvas.height/2, mouseX, mouseY);

  /* ---- Recarga ---- */
  if(j.recarregando){
    j.recargaAtual += dt;
    if(j.recargaAtual >= j.tempoRecarga){
      j.municao = j.municaoMax;
      j.recarregando = false;
      j.recargaAtual = 0;
    }
  }

  /* ---- Tiro ---- */
  if(mouseDown && !j.recarregando && j.municao>0){
    if(jogo.tempoDeJogo - j.ultimoTiro >= j.intervaloTiro){
      atirar(j);
      j.ultimoTiro = jogo.tempoDeJogo;
    }
  }
  if(j.municao<=0 && !j.recarregando){
    j.recarregando = true;
    j.recargaAtual = 0;
  }

  /* ---- Spawns de inimigos ---- */
  if(jogo.modo==='infinito' || jogo.inimigosSpawnados < jogo.inimigosParaSpawnar){
    jogo.tempoDesdeUltimoSpawn += dt;
    if(jogo.tempoDesdeUltimoSpawn >= jogo.intervaloSpawn){
      jogo.tempoDesdeUltimoSpawn = 0;
      // spawna 2 monstros de cada vez (exceto na onda do chefão, que spawna só ele)
      for(let i=0;i<2;i++){
        if(jogo.modo==='infinito' || jogo.inimigosSpawnados < jogo.inimigosParaSpawnar){
          spawnarInimigo();
        }
      }
    }
  }

  /* ---- Spawn de orbs de XP a cada 1,5s ---- */
  jogo.tempoDesdeUltimoOrb += dt;
  if(jogo.tempoDesdeUltimoOrb >= 1500){
    jogo.tempoDesdeUltimoOrb = 0;
    spawnarOrb();
  }

  /* ---- Atualiza inimigos ---- */
  jogo.inimigos.forEach(inimigo=>{
    if(!inimigo.vivo) return;
    if(inimigo.paralisiaRestante > 0){
      // paralisado pela Corrente Elétrica: fica parado e leva dano por segundo
      inimigo.paralisiaRestante -= dt;
      inimigo.hp -= (inimigo.paralisiaDano || 0) * (dt/1000);
      if(inimigo.hp <= 0){
        matarInimigo(inimigo);
      }
      return;
    }
    const bnAlvo = buracoNegroMaisProximo(inimigo);
    if(bnAlvo){
      // puxado pelo Buraco Negro: ignora a IA normal e é sugado na direção dele
      const ang = angleTo(inimigo.x, inimigo.y, bnAlvo.x, bnAlvo.y);
      const velPuxao = 190;
      inimigo.angulo = ang;
      inimigo.x += Math.cos(ang) * velPuxao * (dt/1000);
      inimigo.y += Math.sin(ang) * velPuxao * (dt/1000);
      if(dist(inimigo.x, inimigo.y, bnAlvo.x, bnAlvo.y) < bnAlvo.raio + inimigo.raio*0.5){
        inimigo.hp -= bnAlvo.danoPorSegundo * (dt/1000);
        if(inimigo.hp <= 0){
          matarInimigo(inimigo);
        }
      }
      return;
    }
    if(inimigo.tipo === 'chefao'){
      atualizarChefao(inimigo, dt);
    } else if(inimigo.tipo === 'pesadelo'){
      atualizarPesadelo(inimigo, dt);
    } else {
      atualizarInimigo(inimigo, dt);
    }
  });
  jogo.inimigos = jogo.inimigos.filter(i=>i.vivo);

  /* ---- Atualiza projéteis ---- */
  jogo.projeteis.forEach(p=>{
    p.x += p.vx * (dt/1000);
    p.y += p.vy * (dt/1000);
    p.vida -= dt;
  });
  jogo.projeteis = jogo.projeteis.filter(p=>p.vida>0);

  /* ---- Atualiza lasers dos pesadelos ---- */
  jogo.projeteisInimigos.forEach(p=>{
    p.x += p.vx * (dt/1000);
    p.y += p.vy * (dt/1000);
    p.vida -= dt;
  });
  jogo.projeteisInimigos = jogo.projeteisInimigos.filter(p=>p.vida>0);

  /* ---- Colisão laser inimigo x jogador ---- */
  jogo.projeteisInimigos.forEach(p=>{
    if(p.usado) return;
    if(dist(p.x,p.y, j.x,j.y) < j.raio + p.raio){
      j.vida = clamp(j.vida - p.dano, 0, j.vidaMax);
      p.usado = true;
    }
  });
  jogo.projeteisInimigos = jogo.projeteisInimigos.filter(p=>!p.usado);

  /* ---- Colisão projétil x inimigo ---- */
  jogo.projeteis.forEach(p=>{
    if(p.usado) return;
    jogo.inimigos.forEach(inimigo=>{
      if(!inimigo.vivo) return;
      if(p.atingidos.includes(inimigo)) return;
      if(dist(p.x,p.y, inimigo.x, inimigo.y) < inimigo.raio + p.raio){
        inimigo.hp -= p.dano;
        p.atingidos.push(inimigo);
        criarParticulasImpacto(inimigo.x, inimigo.y);
        if(j.vampiroPorTiro>0){
          j.vida = clamp(j.vida + j.vampiroPorTiro, 0, j.vidaMax);
        }
        if(inimigo.hp<=0){
          matarInimigo(inimigo);
        }
        // Habilidade "Corrente Elétrica": no impacto, paraliza até 5 monstros próximos
        if(p.correnteEletrica && !p.correnteDisparada){
          p.correnteDisparada = true;
          dispararCorrenteEletrica(inimigo, j.personagem.habilidade);
        }
        // perfuração: primeiro consome a perfuração garantida da arma (ex: sniper), depois a chance da habilidade
        let continuaViagem;
        if(p.perfuracoesRestantes > 0){
          p.perfuracoesRestantes--;
          continuaViagem = true;
        } else {
          continuaViagem = Math.random() < j.chancePerfuracao;
        }
        if(!continuaViagem){
          p.usado = true;
        }
      }
    });
  });
  jogo.projeteis = jogo.projeteis.filter(p=>!p.usado);

  /* ---- Coleta de orbs ---- */
  jogo.orbs.forEach(o=>{
    if(o.coletado) return;
    if(dist(j.x,j.y,o.x,o.y) < j.raio + o.raio + 4){
      o.coletado = true;
      ganharXP(10);
    }
  });
  jogo.orbs = jogo.orbs.filter(o=>!o.coletado);

  /* ---- Moedas no chão: efeito ímã até o jogador ---- */
  jogo.moedasChao.forEach(m=>{
    if(m.coletado) return;
    const dx = j.x - m.x, dy = j.y - m.y;
    const dAtual = Math.hypot(dx,dy) || 0.001;
    if(dAtual < j.raio + m.raio + 6){
      m.coletado = true;
      salvarMoedas(obterMoedas() + m.valor);
      criarPopupMoeda('+'+m.valor);
    } else {
      const velIma = 420 * (dt/1000);
      m.x += (dx/dAtual) * velIma;
      m.y += (dy/dAtual) * velIma;
    }
  });
  jogo.moedasChao = jogo.moedasChao.filter(m=>!m.coletado);

  /* ---- Popups de moedas (+N) ---- */
  jogo.popupsMoedas.forEach(p=>{ p.vida -= dt; });
  jogo.popupsMoedas = jogo.popupsMoedas.filter(p=>p.vida>0);

  /* ---- Partículas ---- */
  jogo.particulas.forEach(p=>{ p.vida -= dt; p.x += p.vx*(dt/1000); p.y += p.vy*(dt/1000); });
  jogo.particulas = jogo.particulas.filter(p=>p.vida>0);

  /* ---- Checa fim de onda (não se aplica ao modo infinito) ---- */
  if(jogo.modo !== 'infinito'){
    const totalOnda = jogo.inimigosParaSpawnar;
    if(jogo.inimigosSpawnados >= totalOnda && jogo.inimigos.length===0 && jogo.ondaEmAndamento){
      jogo.ondaEmAndamento = false;
      avancarOnda();
    }
  }

  /* ---- Checa derrota ---- */
  if(j.vida<=0 && !jogo.fimDeJogo){
    jogo.fimDeJogo = true;
    mostrarDerrota();
  }

  atualizarHUD();
}

function dispararCorrenteEletrica(origemInimigo, hab){
  const maxAlvos = hab.alvos || 5;
  const alvos = jogo.inimigos
    .filter(i=>i.vivo)
    .sort((a,b)=> dist(origemInimigo.x,origemInimigo.y,a.x,a.y) - dist(origemInimigo.x,origemInimigo.y,b.x,b.y))
    .slice(0, maxAlvos);
  alvos.forEach(alvo=>{
    alvo.paralisiaRestante = hab.duracao;
    alvo.paralisiaDano = hab.danoPorSegundo;
    criarParticulasImpacto(alvo.x, alvo.y);
  });
}

function invocarPesadeloVivo(j, hab){
  jogo.aliados.push({
    x: j.x - Math.cos(j.miraAngulo)*40,
    y: j.y - Math.sin(j.miraAngulo)*40,
    raio: 16,
    duracaoRestante: hab.duracao,
    duracaoMax: hab.duracao,
    dano: hab.dano,
    intervaloAtaque: hab.intervaloAtaque,
    alcance: hab.alcance,
    velocidade: hab.velocidade || 190,
    ultimoAtaque: -Infinity,
    flashAtaque: 0,
    alvoX: 0, alvoY: 0,
    angulo: j.miraAngulo,
  });
}

function dispararAtomico(j, hab){
  jogo.inimigos.forEach(inimigo=>{
    if(!inimigo.vivo) return;
    if(inimigo.tipo === 'chefao') return; // o chefão sobrevive à explosão
    criarParticulasImpacto(inimigo.x, inimigo.y);
    matarInimigo(inimigo);
  });
  jogo.flashAtomicoRestante = 400; // flash visual na tela, em ms
}

function dispararBuracoNegro(j, hab){
  const vel = hab.velocidade || 260;
  jogo.buracosNegros.push({
    x: j.x + Math.cos(j.miraAngulo)*(j.raio+30),
    y: j.y + Math.sin(j.miraAngulo)*(j.raio+30),
    vx: Math.cos(j.miraAngulo)*vel,
    vy: Math.sin(j.miraAngulo)*vel,
    raio: hab.raio || 55,
    duracaoRestante: hab.duracao,
    danoPorSegundo: hab.danoPorSegundo,
    anguloGiro: 0,
  });
}

// distância de um ponto (px,py) até o segmento de reta (x1,y1)-(x2,y2)
function distPontoSegmento(px,py,x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1;
  const lenSq = dx*dx+dy*dy;
  let t = lenSq>0 ? ((px-x1)*dx + (py-y1)*dy)/lenSq : 0;
  t = clamp(t,0,1);
  const cx = x1+dx*t, cy=y1+dy*t;
  return dist(px,py,cx,cy);
}

// Habilidade "Feixe Laser" (arma ULTIMATE): dano por segundo a todo inimigo tocado pelo feixe
function aplicarDanoFeixeLaser(j, dt){
  const hab = j.habilidadeArma;
  if(!hab) return;
  const alcance = hab.alcance || 1100;
  const largura = hab.largura || 16;
  const x1 = j.x, y1 = j.y;
  const x2 = j.x + Math.cos(j.laserArmaAngulo)*alcance;
  const y2 = j.y + Math.sin(j.laserArmaAngulo)*alcance;
  jogo.inimigos.forEach(inimigo=>{
    if(!inimigo.vivo) return;
    if(distPontoSegmento(inimigo.x,inimigo.y,x1,y1,x2,y2) < (largura/2 + inimigo.raio)){
      inimigo.hp -= hab.danoPorSegundo * (dt/1000);
      if(inimigo.hp<=0){
        matarInimigo(inimigo);
      }
    }
  });
}

function buracoNegroMaisProximo(inimigo){
  if(!jogo.buracosNegros || jogo.buracosNegros.length===0) return null;
  let melhor=null, melhorD=Infinity;
  jogo.buracosNegros.forEach(bn=>{
    const d = dist(inimigo.x,inimigo.y,bn.x,bn.y);
    if(d<melhorD){ melhorD=d; melhor=bn; }
  });
  return melhor;
}

function atirar(j){
  const vel = 1400; // px/s - mais rápida
  let danoTiro = j.dano;
  if(j.habilidadeAtiva && j.personagem && j.personagem.habilidade.bonusDano){
    danoTiro *= (1 + j.personagem.habilidade.bonusDano);
  }
  const correnteArmada = !!j.correntePronta;
  jogo.projeteis.push({
    x: j.x + Math.cos(j.miraAngulo)*(j.raio+18),
    y: j.y + Math.sin(j.miraAngulo)*(j.raio+18),
    vx: Math.cos(j.miraAngulo)*vel,
    vy: Math.sin(j.miraAngulo)*vel,
    raio: 4,          // raio de colisão (menor)
    comprimento: 14,  // munição retangular: comprimento
    largura: 4,        // munição retangular: largura
    angulo: j.miraAngulo,
    dano: danoTiro,
    vida: 1500,
    atingidos: [],
    usado:false,
    perfuracoesRestantes: j.perfuracoesArma || 0, // perfuração garantida da arma (ex: sniper)
    correnteEletrica: correnteArmada,
    correnteDisparada: false,
  });
  j.municao--;
  if(correnteArmada){
    j.correntePronta = false;
    j.correnteCooldownRestante = j.personagem.habilidade.cooldown || 10000;
  }
}

function criarParticulasImpacto(x,y){
  for(let i=0;i<5;i++){
    const ang = rand(0,Math.PI*2);
    jogo.particulas.push({
      x,y, vx:Math.cos(ang)*80, vy:Math.sin(ang)*80,
      vida: 300, cor:'#ffe14d'
    });
  }
}

function spawnarInimigo(){
  const j = jogo.jogador;

  // onda do chefão: spawna só ele, uma única vez
  if(jogo.modo!=='infinito' && jogo.ondaIndex === ONDA_CHEFAO_INDEX){
    if(jogo.inimigosSpawnados>=1) return;
    const ang = rand(0, Math.PI*2);
    const raioSpawn = 480;
    const x = clamp(j.x + Math.cos(ang)*raioSpawn, 60, MUNDO.largura-60);
    const y = clamp(j.y + Math.sin(ang)*raioSpawn, 60, MUNDO.altura-60);
    jogo.inimigos.push(criarChefao(x,y));
    jogo.inimigosSpawnados = 1;
    return;
  }

  const ang = rand(0, Math.PI*2);
  const raioSpawn = Math.max(canvas.width, canvas.height)/(2*zoom) + 160;
  let x = clamp(j.x + Math.cos(ang)*raioSpawn, 30, MUNDO.largura-30);
  let y = clamp(j.y + Math.sin(ang)*raioSpawn, 30, MUNDO.altura-30);
  const tipo = sortearTipoInimigo(jogo.ondaIndex);
  jogo.inimigos.push(criarInimigo(tipo, x, y));
  jogo.inimigosSpawnados++;
}

function spawnarOrb(){
  const j = jogo.jogador;
  const ang = rand(0,Math.PI*2);
  const r = rand(150, 650);
  const x = clamp(j.x + Math.cos(ang)*r, 30, MUNDO.largura-30);
  const y = clamp(j.y + Math.sin(ang)*r, 30, MUNDO.altura-30);
  jogo.orbs.push({x,y, raio:8, coletado:false, pulso:0});
}

function atualizarInimigo(inimigo, dt){
  const j = jogo.jogador;
  const d = dist(inimigo.x, inimigo.y, j.x, j.y);
  inimigo.angulo = angleTo(inimigo.x, inimigo.y, j.x, j.y);
  const alcanceAtaque = inimigo.raio + j.raio + 26;

  inimigo.tempoEstado += dt;

  if(inimigo.estado==='perseguindo'){
    if(d > alcanceAtaque){
      const vel = inimigo.velocidade * (dt/1000);
      inimigo.x += Math.cos(inimigo.angulo)*vel;
      inimigo.y += Math.sin(inimigo.angulo)*vel;
    } else {
      inimigo.estado='abrindo';
      inimigo.tempoEstado=0;
    }
  } else if(inimigo.estado==='abrindo'){
    // abre os braços
    if(inimigo.tempoEstado >= 320){
      inimigo.estado='atacando';
      inimigo.tempoEstado=0;
    }
  } else if(inimigo.estado==='atacando'){
    // fecha/cruza os braços - dá dano no meio do movimento
    if(inimigo.tempoEstado >= 90 && !inimigo.golpeDado){
      if(d < alcanceAtaque+10){
        j.vida = clamp(j.vida - inimigo.dano, 0, j.vidaMax);
      }
      inimigo.golpeDado = true;
    }
    if(inimigo.tempoEstado >= 260){
      inimigo.estado='recuo';
      inimigo.tempoEstado=0;
      inimigo.golpeDado=false;
    }
  } else if(inimigo.estado==='recuo'){
    if(inimigo.tempoEstado >= 550){
      inimigo.estado='perseguindo';
      inimigo.tempoEstado=0;
    }
  }
}

function atualizarPesadelo(inimigo, dt){
  const j = jogo.jogador;
  const d = dist(inimigo.x, inimigo.y, j.x, j.y);
  inimigo.tempoEstado += dt;

  if(inimigo.estado === 'perseguindo'){
    inimigo.angulo = angleTo(inimigo.x, inimigo.y, j.x, j.y);
    if(d > inimigo.alcanceDisparo){
      const vel = inimigo.velocidade * (dt/1000);
      inimigo.x += Math.cos(inimigo.angulo)*vel;
      inimigo.y += Math.sin(inimigo.angulo)*vel;
    } else {
      inimigo.estado = 'carregando';
      inimigo.tempoEstado = 0;
      inimigo.disparoFeito = false;
    }
  } else if(inimigo.estado === 'carregando'){
    // fica parado, mirando continuamente no jogador enquanto carrega o laser
    inimigo.angulo = angleTo(inimigo.x, inimigo.y, j.x, j.y);
    if(inimigo.tempoEstado >= inimigo.tempoCarga && !inimigo.disparoFeito){
      dispararLaserInimigo(inimigo);
      inimigo.disparoFeito = true;
    }
    if(inimigo.tempoEstado >= inimigo.tempoCarga + 150){
      inimigo.estado = 'recuo';
      inimigo.tempoEstado = 0;
    }
  } else if(inimigo.estado === 'recuo'){
    if(inimigo.tempoEstado >= inimigo.cooldownPosDisparo){
      inimigo.estado = 'perseguindo';
      inimigo.tempoEstado = 0;
    }
  }
}

function dispararLaserInimigo(inimigo){
  const velLaser = 1600; // laser MUITO mais rápido, quase impossível de esquivar de longe
  jogo.projeteisInimigos.push({
    x: inimigo.x + Math.cos(inimigo.angulo)*(inimigo.raio+10),
    y: inimigo.y + Math.sin(inimigo.angulo)*(inimigo.raio+10),
    vx: Math.cos(inimigo.angulo)*velLaser,
    vy: Math.sin(inimigo.angulo)*velLaser,
    raio: 7,
    dano: inimigo.danoLaser,
    vida: 2500,
    usado:false,
  });
}

function matarInimigo(inimigo){
  inimigo.vivo=false;
  jogo.inimigosMortosNaOnda++;
  jogo.inimigosMortosTotal++;
  ganharXP(5);

  // dropa moeda(s): 45% de chance de dropar, valor aleatório entre 2 e 5
  if(Math.random() < 0.45){
    const valor = randInt(2,5);
    jogo.moedasChao.push({ x:inimigo.x, y:inimigo.y, valor, raio:7, pulso: rand(0,10) });
  }
}

function criarPopupMoeda(texto){
  jogo.popupsMoedas.push({ texto, vida:1200, vidaMax:1200, offsetX: rand(-8,8) });
}

function ganharXP(qtd){
  const j = jogo.jogador;
  j.xp += qtd;
  while(j.xp >= j.xpParaProximo){
    j.xp -= j.xpParaProximo;
    subirNivel();
  }
}

function subirNivel(){
  const j = jogo.jogador;
  j.nivel++;
  j.vida = clamp(j.vida + 20, 0, j.vidaMax);
  abrirTelaLevelUp();
}

function avancarOnda(){
  const j = jogo.jogador;
  j.vida = j.vidaMax; // recupera toda a vida a cada onda completada

  if(jogo.ondaIndex >= CONFIG_ONDAS.length-1){
    // acabaram as 10 ondas (chefão derrotado)
    mostrarVitoria();
    return;
  }
  jogo.ondaIndex++;
  jogo.inimigosParaSpawnar = CONFIG_ONDAS[jogo.ondaIndex];
  jogo.inimigosSpawnados = 0;
  jogo.inimigosMortosNaOnda = 0;
  jogo.ondaEmAndamento = true;
  if(jogo.ondaIndex === ONDA_CHEFAO_INDEX){
    mostrarAvisoOnda('ONDA 10 — CHEFÃO!');
  } else {
    mostrarAvisoOnda('Onda '+(jogo.ondaIndex+1));
  }
}

/* =========================================================================
   HUD
========================================================================= */
let ultimoMunicaoMaxHUD = -1;
function atualizarHUD(){
  if(!jogo) return;
  const j = jogo.jogador;
  document.getElementById('barra-vida-fill').style.width = clamp((j.vida/j.vidaMax)*100,0,100)+'%';
  document.getElementById('nick-jogador-hud').textContent = obterNick();
  document.getElementById('moedas-total').textContent = obterMoedas();

  // indicador de habilidade do personagem (ícone na frente do nome, verde quando ativa)
  const habEl = document.getElementById('habilidade-hud');
  const hab = j.personagem && j.personagem.habilidade;
  if(hab){
    habEl.style.display = 'flex';
    document.getElementById('habilidade-hud-icone').textContent = hab.icone;
    let indicadorAtivo = false;
    let textoNome = hab.nome;
    if(hab.id === 'rage'){
      indicadorAtivo = !!j.habilidadeAtiva;
    } else if(hab.id === 'corrente-eletrica'){
      indicadorAtivo = !!j.correntePronta;
      if(j.correntePronta){
        textoNome += ' (armada!)';
      } else if(j.correnteCooldownRestante > 0){
        textoNome += ` (${Math.ceil(j.correnteCooldownRestante/1000)}s)`;
      }
    } else if(hab.id === 'buraco-negro'){
      indicadorAtivo = jogo.buracosNegros && jogo.buracosNegros.length > 0;
      if(j.buracoNegroCooldownRestante > 0){
        textoNome += ` (${Math.ceil(j.buracoNegroCooldownRestante/1000)}s)`;
      } else {
        textoNome += ' (pronta!)';
      }
    } else if(hab.id === 'atomico'){
      indicadorAtivo = jogo.flashAtomicoRestante > 0;
      if(j.atomicoCooldownRestante > 0){
        const s = Math.ceil(j.atomicoCooldownRestante/1000);
        textoNome += ` (${Math.floor(s/60)}:${String(s%60).padStart(2,'0')})`;
      } else {
        textoNome += ' (pronta!)';
      }
    } else if(hab.id === 'pesadelo-vivo'){
      indicadorAtivo = jogo.aliados && jogo.aliados.length > 0;
      if(j.pesadeloVivoCooldownRestante > 0){
        textoNome += ` (${Math.ceil(j.pesadeloVivoCooldownRestante/1000)}s)`;
      } else {
        textoNome += ' (pronta!)';
      }
    }
    document.getElementById('habilidade-hud-nome').textContent = textoNome;
    habEl.classList.toggle('ativa', indicadorAtivo);
  } else {
    habEl.style.display = 'none';
  }

  // indicador da habilidade ativa da arma (ex: ULTIMATE - Feixe Laser, tecla E)
  const armaHabEl = document.getElementById('arma-habilidade-hud');
  const habArma = j.habilidadeArma;
  if(habArma){
    armaHabEl.style.display = 'flex';
    document.getElementById('arma-habilidade-hud-icone').textContent = habArma.icone;
    let textoArma = habArma.nome + ' (E)';
    let ativaArma = false;
    if(j.laserArmaDuracaoRestante > 0){
      ativaArma = true;
      textoArma += ` (${(j.laserArmaDuracaoRestante/1000).toFixed(1)}s)`;
    } else if(j.laserArmaCooldownRestante > 0){
      textoArma += ` (${Math.ceil(j.laserArmaCooldownRestante/1000)}s)`;
    } else {
      textoArma += ' (pronta!)';
    }
    document.getElementById('arma-habilidade-hud-nome').textContent = textoArma;
    armaHabEl.classList.toggle('ativa', ativaArma);
  } else {
    armaHabEl.style.display = 'none';
  }

  // barra de munição retangular e segmentada (tipo IIIIII)
  const contMunicaoEl = document.getElementById('barra-municao-segmentos');
  if(j.municaoMax !== ultimoMunicaoMaxHUD){
    ultimoMunicaoMaxHUD = j.municaoMax;
    contMunicaoEl.innerHTML = '';
    const maxSegmentosVisiveis = 25; // limite visual p/ armas com muita munição (ex: minigun)
    const totalSegmentos = Math.max(1, Math.min(j.municaoMax, maxSegmentosVisiveis));
    for(let i=0;i<totalSegmentos;i++){
      const seg = document.createElement('div');
      seg.className = 'municao-segmento';
      contMunicaoEl.appendChild(seg);
    }
  }
  const totalSegAtual = contMunicaoEl.children.length;
  const proporcaoMunicao = j.municao / j.municaoMax;
  const segmentosCheios = Math.round(proporcaoMunicao * totalSegAtual);
  for(let i=0;i<totalSegAtual;i++){
    contMunicaoEl.children[i].classList.toggle('cheio', i < segmentosCheios);
  }

  document.getElementById('barra-xp-fill').style.width = clamp((j.xp/j.xpParaProximo)*100,0,100)+'%';
  document.getElementById('nivel-badge').textContent = j.nivel;
  document.getElementById('reload-aviso').style.display = j.recarregando ? 'block':'none';

  const tituloEl = document.getElementById('onda-titulo');
  if(jogo.modo === 'infinito'){
    tituloEl.innerHTML = 'Modo <strong>Infinito</strong>';
    document.getElementById('inimigos-restantes').textContent = jogo.inimigosMortosTotal + ' inimigos derrotados';
  } else {
    tituloEl.innerHTML = 'Onda <strong>'+(jogo.ondaIndex+1)+'</strong> / '+CONFIG_ONDAS.length;
    const restantes = Math.max(0, jogo.inimigosParaSpawnar - jogo.inimigosMortosNaOnda);
    document.getElementById('inimigos-restantes').textContent = restantes + ' inimigos restantes';
  }

  // barra de vida do chefão
  const chefao = jogo.inimigos.find(i=>i.tipo==='chefao' && i.vivo);
  const barraChefaoEl = document.getElementById('barra-chefao');
  if(chefao){
    barraChefaoEl.style.display = 'block';
    document.getElementById('barra-chefao-fill').style.width = clamp((chefao.hp/chefao.hpMax)*100,0,100)+'%';
  } else {
    barraChefaoEl.style.display = 'none';
  }
}

let avisoTimeout=null;
function mostrarAvisoOnda(texto){
  const el = document.getElementById('aviso-onda');
  el.textContent = texto;
  el.classList.add('show');
  clearTimeout(avisoTimeout);
  avisoTimeout = setTimeout(()=> el.classList.remove('show'), 1800);
}

/* =========================================================================
   LEVEL UP - CARTAS DE HABILIDADE
========================================================================= */
function habilidadeNoMax(chave){
  const max = HABILIDADES_MAX[chave] || Infinity;
  const atual = (jogo && jogo.habilidadesContagem && jogo.habilidadesContagem[chave]) || 0;
  return atual >= max;
}

function abrirTelaLevelUp(){
  pausado = true;
  const chaves = Object.keys(HABILIDADES);
  // embaralha e pega 3 distintas
  for(let i=chaves.length-1;i>0;i--){
    const k = randInt(0,i);
    [chaves[i],chaves[k]] = [chaves[k],chaves[i]];
  }
  const escolhidas = chaves.slice(0,3);

  const container = document.getElementById('cartas-habilidade');
  container.innerHTML='';
  escolhidas.forEach(chave=>{
    const h = HABILIDADES[chave];
    const noMax = habilidadeNoMax(chave);
    const carta = document.createElement('div');
    carta.className = 'carta' + (noMax ? ' carta-bloqueada' : '');
    carta.innerHTML = `
      ${noMax ? '<div class="carta-cadeado">🔒</div>' : ''}
      <div class="icone">${h.icone}</div>
      <h3>${h.nome}</h3>
      <p>${h.desc}</p>
      ${noMax ? '<p class="carta-max-aviso">Nível máximo atingido</p>' : ''}
    `;
    if(!noMax){
      carta.addEventListener('click', ()=>{
        aplicarHabilidade(chave);
        mostrarTela('jogo');
        pausado=false;
      });
    }
    container.appendChild(carta);
  });

  mostrarTela('levelup');
}

function aplicarHabilidade(chave){
  const j = jogo.jogador;
  if(!jogo.habilidadesContagem) jogo.habilidadesContagem = {};
  if(habilidadeNoMax(chave)) return; // segurança extra: nunca ultrapassa o limite máximo
  jogo.habilidadesContagem[chave] = (jogo.habilidadesContagem[chave] || 0) + 1;
  switch(chave){
    case 'velocidadeTiro':
      j.tempoRecarga = Math.max(800, j.tempoRecarga - 200);
      break;
    case 'velocidadeTiro2':
      j.intervaloTiro = Math.max(150, j.intervaloTiro - 200);
      break;
    case 'velocidade':
      j.velocidadeStat = Math.min(50, j.velocidadeStat + 2);
      break;
    case 'dano':
      j.dano += 1.2;
      break;
    case 'perfuracao':
      j.chancePerfuracao = Math.min(1, j.chancePerfuracao + 0.05);
      break;
    case 'vampiro':
      j.vampiroPorTiro += 1;
      break;
    case 'municaoExtra':
      j.municaoMax += 1;
      j.municao = Math.min(j.municaoMax, j.municao + 1);
      break;
    case 'vidaExtra':
      j.vidaMax += 15;
      j.vida = Math.min(j.vidaMax, j.vida + 15);
      break;
  }
}

/* =========================================================================
   VITÓRIA / DERROTA
========================================================================= */
function mostrarVitoria(){
  jogo.fimDeJogo = true;
  if(jogo.modo === 'ondas'){
    somarVitoria();
  }
  const j = jogo.jogador;
  document.getElementById('stats-vitoria').innerHTML =
    `Nível alcançado: <b>${j.nivel}</b><br>Inimigos derrotados: <b>${jogo.inimigosMortosTotal}</b>`;
  mostrarTela('vitoria');
}

function mostrarDerrota(){
  const j = jogo.jogador;
  document.getElementById('stats-derrota').innerHTML =
    `Onda alcançada: <b>${jogo.ondaIndex+1}</b><br>Nível: <b>${j.nivel}</b><br>Inimigos derrotados: <b>${jogo.inimigosMortosTotal}</b>`;
  mostrarTela('derrota');
}

/* =========================================================================
   DESENHO
========================================================================= */
function desenhar(){
  if(!jogo) return;
  const j = jogo.jogador;
  visW = canvas.width / zoom;
  visH = canvas.height / zoom;
  const camX = j.x - visW/2;
  const camY = j.y - visH/2;

  ctx.save();
  ctx.scale(zoom, zoom);

  desenharChao(camX,camY);
  desenharVinhas(camX,camY);
  desenharArvores(camX,camY,true); // sombras primeiro

  // orbs de xp
  jogo.orbs.forEach(o=>{
    o.pulso += 0.08;
    const sx=o.x-camX, sy=o.y-camY;
    if(sx<-30||sx>visW+30||sy<-30||sy>visH+30) return;
    const p = 1 + Math.sin(o.pulso)*0.15;
    ctx.beginPath();
    ctx.arc(sx,sy,o.raio*p,0,Math.PI*2);
    ctx.fillStyle = 'rgba(79,195,255,0.9)';
    ctx.shadowColor = '#4fc3ff';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // moedas no chão (bolinhas amarelas, com efeito ímã)
  jogo.moedasChao.forEach(m=>{
    m.pulso += 0.12;
    const sx=m.x-camX, sy=m.y-camY;
    if(sx<-30||sx>visW+30||sy<-30||sy>visH+30) return;
    const p = 1 + Math.sin(m.pulso)*0.15;
    ctx.beginPath();
    ctx.arc(sx,sy,m.raio*p,0,Math.PI*2);
    ctx.fillStyle = '#ffe14d';
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#c99a00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // inimigos
  jogo.inimigos.forEach(inimigo=> desenharPersonagemInimigo(inimigo, camX, camY));

  // buracos negros (habilidade Sombra Roxa)
  jogo.buracosNegros.forEach(bn=> desenharBuracoNegro(bn, camX, camY));

  // aliados invocados (habilidade Pesadelo Amarelo)
  jogo.aliados.forEach(aliado=> desenharAliado(aliado, camX, camY));

  // feixe de laser (habilidade da arma ULTIMATE)
  if(j.laserArmaDuracaoRestante > 0){
    desenharFeixeLaser(j, camX, camY);
  }

  // outros jogadores
  Object.values(outrosJogadores).forEach(outro => {
    desenharJogador({
      x: outro.x, y: outro.y, raio: 15, corCabeca: outro.corCabeca || '#39ff6a', 
      miraAngulo: 0, tamanhoArma: 1
    }, camX, camY);
  });

  // jogador principal
  desenharJogador(j, camX, camY);

  // projéteis (munição retangular, alinhada com a direção do tiro)
  jogo.projeteis.forEach(p=>{
    const sx=p.x-camX, sy=p.y-camY;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.angulo || 0);
    ctx.fillStyle='#ffe14d';
    ctx.shadowColor='#ffe14d';
    ctx.shadowBlur=8;
    ctx.fillRect(-p.comprimento/2, -p.largura/2, p.comprimento, p.largura);
    ctx.shadowBlur=0;
    ctx.restore();
  });

  // lasers dos pesadelos
  jogo.projeteisInimigos.forEach(p=>{
    const sx=p.x-camX, sy=p.y-camY;
    const velMod = Math.hypot(p.vx,p.vy) || 1;
    const tailX = sx - (p.vx/velMod)*22;
    const tailY = sy - (p.vy/velMod)*22;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tailX,tailY);
    ctx.lineTo(sx,sy);
    ctx.strokeStyle = '#c400ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#c400ff';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(sx,sy,p.raio,0,Math.PI*2);
    ctx.fillStyle = '#f0aaff';
    ctx.fill();
    ctx.restore();
  });

  // partículas
  jogo.particulas.forEach(p=>{
    const sx=p.x-camX, sy=p.y-camY;
    ctx.globalAlpha = clamp(p.vida/300,0,1);
    ctx.fillStyle = p.cor;
    ctx.fillRect(sx-2,sy-2,4,4);
    ctx.globalAlpha=1;
  });

  desenharArvores(camX,camY,false); // copas por cima

  ctx.restore(); // volta escala 1:1 pra desenhar a UI fixa (vinheta, flash, popups)

  // vinheta
  const grad = ctx.createRadialGradient(canvas.width/2,canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height/1.1);
  grad.addColorStop(0,'rgba(0,0,0,0)');
  grad.addColorStop(1,'rgba(5,0,10,0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // flash da habilidade ATÔMICO (Bomba Rosa)
  if(jogo.flashAtomicoRestante > 0){
    ctx.save();
    ctx.globalAlpha = clamp(jogo.flashAtomicoRestante/400, 0, 1) * 0.85;
    ctx.fillStyle = '#ff5da2';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  // popups de moedas coletadas (+N), no canto inferior direito da tela
  jogo.popupsMoedas.forEach((p,idx)=>{
    const t = 1 - p.vida/p.vidaMax;
    const x = canvas.width - 90 + p.offsetX;
    const y = canvas.height - 90 - t*40 - idx*22;
    ctx.save();
    ctx.globalAlpha = clamp(p.vida/300,0,1);
    ctx.fillStyle = '#ffe14d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 8;
    ctx.fillText(p.texto, x, y);
    ctx.restore();
  });
}

function desenharJogador(j, camX, camY){
  const sx = j.x-camX, sy = j.y-camY;

  // sombra
  ctx.beginPath();
  ctx.ellipse(sx, sy+j.raio*0.7, j.raio*0.9, j.raio*0.35, 0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fill();

  // braço (oval esticado) + arma
  const ang = j.miraAngulo;
  const ombroX = sx + Math.cos(ang)*j.raio*0.5;
  const ombroY = sy + Math.sin(ang)*j.raio*0.5;
  const maoX = sx + Math.cos(ang)*(j.raio+20);
  const maoY = sy + Math.sin(ang)*(j.raio+20);

  ctx.save();
  ctx.translate((ombroX+maoX)/2, (ombroY+maoY)/2);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.ellipse(0,0, (j.raio+20-j.raio*0.5)/2, 6, 0,0,Math.PI*2);
  ctx.fillStyle = '#2fae55';
  ctx.fill();
  ctx.restore();

  // arma (retângulo cinza) na mão - tamanho varia conforme a arma equipada
  const escalaArma = j.tamanhoArma || 1;
  const compArma = 28 * escalaArma;
  const largArma = 12 * Math.min(1.3, escalaArma);
  ctx.save();
  ctx.translate(maoX, maoY);
  ctx.rotate(ang);
  ctx.fillStyle = '#8a8a95';
  ctx.strokeStyle = '#4d4d55';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-4, -largArma/2, compArma, largArma);
  ctx.strokeRect(-4, -largArma/2, compArma, largArma);
  ctx.restore();

  // cabeça (bola verde)
  ctx.beginPath();
  ctx.arc(sx, sy, j.raio, 0, Math.PI*2);
  ctx.fillStyle = j.corCabeca;
  ctx.shadowColor = j.corCabeca;
  ctx.shadowBlur = j.recarregando ? 0 : 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1b6b34';
  ctx.lineWidth = 2;
  ctx.stroke();

  // olhinhos simples voltados p/ mira
  ctx.fillStyle='#0c0715';
  const ox = Math.cos(ang)*j.raio*0.45, oy = Math.sin(ang)*j.raio*0.45;
  ctx.beginPath(); ctx.arc(sx+ox, sy+oy, 2.4, 0, Math.PI*2); ctx.fill();
}

function desenharTentaculo(sx, sy, ang, comprimento, largura, ondulacao, cor){
  const midAng = ang + ondulacao*0.5;
  const midX = sx + Math.cos(midAng)*comprimento*0.5;
  const midY = sy + Math.sin(midAng)*comprimento*0.5;
  const endAng = ang + ondulacao;
  const endX = sx + Math.cos(endAng)*comprimento;
  const endY = sy + Math.sin(endAng)*comprimento;

  ctx.beginPath();
  ctx.moveTo(sx,sy);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.lineWidth = largura;
  ctx.lineCap = 'round';
  ctx.strokeStyle = cor;
  ctx.stroke();

  // ventosa na ponta
  ctx.beginPath();
  ctx.arc(endX, endY, largura*0.42, 0, Math.PI*2);
  ctx.fillStyle = cor;
  ctx.fill();
}

function desenharChefao(chefao, camX, camY){
  const sx = chefao.x-camX, sy = chefao.y-camY;

  // marca de área de ataque (telegraph) - aparece antes do golpe acontecer
  if(chefao.estadoAtaque==='telegraph' && chefao.telegraphAlvo){
    const alvo = chefao.telegraphAlvo;
    const progresso = clamp(chefao.tempoEstado/alvo.duracao, 0, 1);
    ctx.save();
    if(alvo.tipo==='circulo'){
      ctx.globalAlpha = 0.20 + progresso*0.35;
      ctx.beginPath();
      ctx.arc(sx, sy, alvo.raio*Math.max(0.15,progresso), 0, Math.PI*2);
      ctx.fillStyle = alvo.cor || '#ff2b4e';
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, alvo.raio, 0, Math.PI*2);
      ctx.stroke();
    } else if(alvo.tipo==='tentaculo'){
      ctx.globalAlpha = 0.18 + progresso*0.25;
      ctx.beginPath();
      ctx.arc(sx, sy, alvo.raio, 0, Math.PI*2);
      ctx.fillStyle = alvo.cor || '#a3132f';
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if(alvo.tipo==='invocacao'){
      alvo.pontos.forEach(p=>{
        const px = p.x-camX, py = p.y-camY;
        const pulso = 1 + Math.sin(chefao.tempoEstado/90)*0.2;
        ctx.beginPath();
        ctx.arc(px,py, 22*pulso, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,225,77,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffe14d';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffe14d';
        ctx.shadowBlur = 10;
        ctx.fillText('?', px, py);
        ctx.shadowBlur = 0;
      });
    }
    ctx.restore();
  }

  // sombra
  ctx.beginPath();
  ctx.ellipse(sx, sy+chefao.raio*0.7, chefao.raio*0.9, chefao.raio*0.35, 0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.45)';
  ctx.fill();

  // braços-tentáculo (sempre visíveis, ondulando; giram rápido durante o ataque "tentáculo")
  const angBase = chefao.angulo;
  if(chefao.estadoAtaque==='telegraph' && chefao.ataqueAtual==='tentaculo'){
    const progresso = chefao.tempoEstado / chefao.telegraphAlvo.duracao;
    const anguloGiro = progresso * Math.PI*4; // duas voltas completas durante a carga
    desenharTentaculo(sx, sy, anguloGiro, chefao.raio*2.7, 13, 0.6, '#8a0020');
    desenharTentaculo(sx, sy, anguloGiro+Math.PI, chefao.raio*2.7, 13, 0.6, '#8a0020');
  } else {
    const idleWiggle = Math.sin(chefao.animTempo/260) * 0.35;
    desenharTentaculo(sx, sy, angBase+Math.PI/2*0.9, chefao.raio*1.7, 11, idleWiggle, '#6e0018');
    desenharTentaculo(sx, sy, angBase-Math.PI/2*0.9, chefao.raio*1.7, 11, -idleWiggle, '#6e0018');
  }

  // cabeça grande
  ctx.beginPath();
  ctx.arc(sx, sy, chefao.raio, 0, Math.PI*2);
  ctx.fillStyle = chefao.cor;
  ctx.shadowColor = chefao.cor;
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#33000a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // dois chifres
  ctx.fillStyle = '#e8dcc8';
  [-0.55, 0.55].forEach(offset=>{
    ctx.save();
    ctx.translate(
      sx + Math.cos(angBase+Math.PI+offset)*chefao.raio*0.6,
      sy + Math.sin(angBase+Math.PI+offset)*chefao.raio*0.6 - chefao.raio*0.5
    );
    ctx.rotate(angBase+Math.PI+offset);
    ctx.beginPath();
    ctx.moveTo(-7,10);
    ctx.lineTo(0,-18);
    ctx.lineTo(7,10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle='#6b5a3f';
    ctx.lineWidth=1;
    ctx.stroke();
    ctx.restore();
  });

  // olhos voltados para o jogador
  ctx.fillStyle='#ffe14d';
  const ox = Math.cos(angBase)*chefao.raio*0.45, oy = Math.sin(angBase)*chefao.raio*0.45;
  ctx.beginPath(); ctx.arc(sx+ox, sy+oy, 4.5, 0, Math.PI*2); ctx.fill();
}

function desenharAliado(aliado, camX, camY){
  const sx = aliado.x-camX, sy = aliado.y-camY;
  if(sx<-60||sx>visW+60||sy<-60||sy>visH+60) return;

  // feixe de ataque (flash amarelo até o alvo)
  if(aliado.flashAtaque > 0){
    ctx.save();
    ctx.globalAlpha = clamp(aliado.flashAtaque/150, 0, 1);
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(aliado.alvoX-camX, aliado.alvoY-camY);
    ctx.stroke();
    ctx.restore();
  }

  // sombra
  ctx.beginPath();
  ctx.ellipse(sx, sy+aliado.raio*0.7, aliado.raio*0.9, aliado.raio*0.35, 0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fill();

  // corpo fantasmagórico semitransparente
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(performance.now()/150)*0.15;
  ctx.beginPath();
  ctx.arc(sx, sy, aliado.raio, 0, Math.PI*2);
  ctx.fillStyle = '#ffe14d';
  ctx.shadowColor = '#ffe14d';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#a68300';
  ctx.lineWidth = 2;
  ctx.stroke();

  // olhos
  ctx.fillStyle = '#2b1b00';
  const ox = Math.cos(aliado.angulo)*aliado.raio*0.4, oy = Math.sin(aliado.angulo)*aliado.raio*0.4;
  ctx.beginPath(); ctx.arc(sx+ox, sy+oy, 2, 0, Math.PI*2); ctx.fill();

  // contorno de duração restante
  const largBarra = aliado.raio*2;
  const baseY = sy - aliado.raio - 10;
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(sx-largBarra/2, baseY, largBarra, 4);
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(sx-largBarra/2, baseY, largBarra * clamp(aliado.duracaoRestante/aliado.duracaoMax,0,1), 4);
}

// Feixe de laser da habilidade ativa da arma ULTIMATE (tecla E)
function desenharFeixeLaser(j, camX, camY){
  const hab = j.habilidadeArma;
  if(!hab) return;
  const alcance = hab.alcance || 1100;
  const largura = hab.largura || 16;
  const sx = j.x-camX, sy = j.y-camY;
  const ex = sx + Math.cos(j.laserArmaAngulo)*alcance;
  const ey = sy + Math.sin(j.laserArmaAngulo)*alcance;

  ctx.save();
  // brilho externo pulsante
  ctx.globalAlpha = 0.35 + Math.sin(performance.now()/60)*0.1;
  ctx.strokeStyle = '#ff2b4e';
  ctx.lineWidth = largura*1.8;
  ctx.shadowColor = '#ff2b4e';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
  ctx.stroke();

  // núcleo sólido do feixe
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = '#ffdada';
  ctx.lineWidth = largura*0.4;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
  ctx.stroke();
  ctx.restore();
}

function desenharBuracoNegro(bn, camX, camY){
  const sx = bn.x-camX, sy = bn.y-camY;
  if(sx<-120||sx>visW+120||sy<-120||sy>visH+120) return;

  // brilho externo roxo pulsante
  ctx.save();
  const grad = ctx.createRadialGradient(sx,sy,bn.raio*0.15, sx,sy,bn.raio*1.6);
  grad.addColorStop(0, 'rgba(166,0,255,0.9)');
  grad.addColorStop(0.5, 'rgba(120,0,200,0.35)');
  grad.addColorStop(1, 'rgba(120,0,200,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy, bn.raio*1.6, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // núcleo escuro (o "buraco negro" em si)
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, bn.raio, 0, Math.PI*2);
  ctx.fillStyle = '#0c0715';
  ctx.shadowColor = '#a600ff';
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.restore();

  // anéis girando (efeito de sucção)
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(bn.anguloGiro);
  for(let i=0;i<3;i++){
    ctx.beginPath();
    ctx.ellipse(0, 0, bn.raio*(0.55+i*0.22), bn.raio*(0.2+i*0.08), i*0.9, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(230,150,255,${0.55-i*0.15})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

function desenharEfeitoParalisia(inimigo, camX, camY){
  const sx = inimigo.x-camX, sy = inimigo.y-camY;
  const t = performance.now();
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(t/60)*0.25;
  ctx.strokeStyle = '#4fc3ff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#4fc3ff';
  ctx.shadowBlur = 10;
  // anel elétrico
  ctx.beginPath();
  ctx.arc(sx, sy, inimigo.raio + 7, 0, Math.PI*2);
  ctx.stroke();
  // raiozinhos aleatórios ao redor
  for(let i=0;i<4;i++){
    const ang = (i/4)*Math.PI*2 + t/200;
    const r1 = inimigo.raio + 4, r2 = inimigo.raio + 16 + Math.sin(t/50+i)*4;
    ctx.beginPath();
    ctx.moveTo(sx+Math.cos(ang)*r1, sy+Math.sin(ang)*r1);
    ctx.lineTo(sx+Math.cos(ang+0.3)*r2, sy+Math.sin(ang+0.3)*r2);
    ctx.stroke();
  }
  ctx.restore();
}

function desenharPersonagemInimigo(inimigo, camX, camY){
  if(!inimigo.vivo) return;
  if(inimigo.tipo === 'chefao'){
    desenharChefao(inimigo, camX, camY);
    if(inimigo.paralisiaRestante > 0) desenharEfeitoParalisia(inimigo, camX, camY);
    return;
  }
  const sx = inimigo.x-camX, sy = inimigo.y-camY;
  if(sx<-60||sx>visW+60||sy<-60||sy>visH+60) return;

  // sombra
  ctx.beginPath();
  ctx.ellipse(sx, sy+inimigo.raio*0.7, inimigo.raio*0.9, inimigo.raio*0.35, 0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fill();

  // progresso de abertura/ataque dos braços (0 = fechados junto ao corpo, 1 = totalmente abertos)
  let aberturaAng = 0.35; // leve abertura padrão enquanto persegue
  if(inimigo.estado==='abrindo'){
    aberturaAng = 0.35 + (inimigo.tempoEstado/320) * 1.0;
  } else if(inimigo.estado==='atacando'){
    const t = clamp(inimigo.tempoEstado/260,0,1);
    aberturaAng = 1.35 * (1-t); // fecha cruzando ao longo do golpe
  } else if(inimigo.estado==='recuo'){
    aberturaAng = 0.35;
  }

  const angBase = inimigo.angulo;
  const braco1Ang = angBase + Math.PI/2 - aberturaAng*0.9;
  const braco2Ang = angBase - Math.PI/2 + aberturaAng*0.9;
  const compBraco = inimigo.raio*1.3;

  [braco1Ang, braco2Ang].forEach(bAng=>{
    const px = sx + Math.cos(bAng)*compBraco*0.5;
    const py = sy + Math.sin(bAng)*compBraco*0.5;
    ctx.save();
    ctx.translate(px,py);
    ctx.rotate(bAng);
    ctx.beginPath();
    ctx.ellipse(0,0, compBraco/2, 5.5, 0,0,Math.PI*2);
    ctx.fillStyle = '#a3132f';
    ctx.fill();
    ctx.restore();
  });

  // cabeça vermelha
  ctx.beginPath();
  ctx.arc(sx, sy, inimigo.raio, 0, Math.PI*2);
  ctx.fillStyle = inimigo.cor;
  ctx.shadowColor = inimigo.cor;
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#5c000f';
  ctx.lineWidth = 2;
  ctx.stroke();

  // olhos voltados para o jogador
  ctx.fillStyle='#ffe14d';
  const ox = Math.cos(angBase)*inimigo.raio*0.45, oy = Math.sin(angBase)*inimigo.raio*0.45;
  ctx.beginPath(); ctx.arc(sx+ox, sy+oy, 2.2, 0, Math.PI*2); ctx.fill();

  if(inimigo.paralisiaRestante > 0) desenharEfeitoParalisia(inimigo, camX, camY);

  // telegraph do pesadelo: mira de laser + brilho pulsante enquanto carrega
  if(inimigo.tipo === 'pesadelo' && inimigo.estado === 'carregando'){
    const progresso = clamp(inimigo.tempoEstado / inimigo.tempoCarga, 0, 1);
    const compLinha = 1200;
    const lx = sx + Math.cos(angBase)*compLinha;
    const ly = sy + Math.sin(angBase)*compLinha;
    ctx.save();
    ctx.globalAlpha = 0.2 + progresso*0.55;
    ctx.strokeStyle = '#c400ff';
    ctx.lineWidth = 1.5 + progresso*4.5;
    ctx.shadowColor = '#c400ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.lineTo(lx,ly);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(inimigo.tempoEstado/70)*0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, inimigo.raio + 9, 0, Math.PI*2);
    ctx.strokeStyle = '#f0aaff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // barra de vida do inimigo (duas barrinhas: hp atual + "escudo" visual conforme pedido de "dois placares")
  const largBarra = inimigo.raio*2.2;
  const baseY = sy - inimigo.raio - 14;
  // barra 1: vida
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(sx-largBarra/2, baseY, largBarra, 5);
  ctx.fillStyle = '#ff2b4e';
  ctx.fillRect(sx-largBarra/2, baseY, largBarra * clamp(inimigo.hp/inimigo.hpMax,0,1), 5);
  // barra 2: tipo/ameaça (cheia = dificuldade do inimigo)
  const nivelAmeaca = inimigo.tipo==='pesadelo' ? 1 : inimigo.tipo==='dificil' ? 0.8 : inimigo.tipo==='medio' ? 0.55 : 0.3;
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(sx-largBarra/2, baseY-7, largBarra, 4);
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(sx-largBarra/2, baseY-7, largBarra*nivelAmeaca, 4);
}

})();