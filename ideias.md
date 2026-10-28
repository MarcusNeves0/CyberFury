# 💢 Cybernetic Fury: A Quinta Corrupção
## Documentação Oficial dos Personagens & Mecânicas

Documento técnico contendo as especificações de estilo, inspiração, pixel-art e sistemas de combate de todos os 9 lutadores do jogo.

---

## 📋 Sumário
1. [Titan](#1-titan)
2. [Spark](#2-spark)
3. [Craque](#3-craque)
4. [Hades](#4-hades)
5. [Jack](#5-jack)
6. [Kaze](#6-kaze)
7. [Kenji](#7-kenji)
8. [Akane](#8-akane)
9. [Fenris](#9-fenris)

---

### 1. TITAN
* **Conceito & Estilo:** Juggernaut cibernético de contenção pesada. Visual robusto com armadura azul elétrico, placas de metal cinza fosco e proporções largas.
* **Inspiração:** Robôs de combate militar e robótica pesada de *Borderlands* / *Overwatch* (Reinhardt/Reaper).
* **Estilo de Luta:** *Grappler / Heavy Zoner*. Movimentos lentos, porém com alto poder de impacto e área de acerto estendida.

#### ⚔️ Mecânicas de Combate:
* **Soco Básico (`ArrowLeft`):** Directo de direita carregado com grande alcance horizontal e alto *knockback* (empurrão).
* **Especial - Disparo de Foguete (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Instancia o projétil `rocket` (🚀). O projétil atravessa a tela em linha reta na direção em que o personagem está virado, causando dano de explosão ao impactar o oponente.

---

### 2. SPARK
* **Conceito & Estilo:** Android de energia pura com chassi cinza metálico e núcleo brilhante. Alterna visualmente entre estados de repouso e descarga eletrostática.
* **Inspiração:** Personagens de manipulação elétrica de jogos de luta clássicos (como Blanka de *Street Fighter* e Raiden de *Mortal Kombat*).
* **Estilo de Luta:** *Pressure / Channeler*. Focado em pressionar o oponente no canto da tela com feixes contínuos.

#### ⚔️ Mecânicas de Combate:
* **Soco Básico (`ArrowLeft`):** Estocada rápida de curto alcance para abrir a guarda do inimigo.
* **Especial - Raio Contínuo (`ArrowRight`):**
  * **Custo:** Drenagem contínua de Energia (4 por *frame*)
  * **Efeito:** Entra no estado `specialActive`. Enquanto o botão estiver pressionado e houver energia suficiente (> 10), Spark projeta um feixe elétrico contínuo em linha reta. Causa dano por segundo (*DoT*) caso o oponente esteja na linha de alcance (< 400px de distância).

---

### 3. CRAQUE
* **Conceito & Estilo:** Atleta cibernético com uniforme esportivo azul e branco. É o único lutador que utiliza munição visível no HUD para seu ataque básico.
* **Inspiração:** Personagens com estilo *Zoner/Gimmick* esportivo e pirotecnia de combate.
* **Estilo de Luta:** *Tactical Zoner*. Mantém o oponente à distância usando projéteis físicos limitados.

#### 3. Mecânicas de Combate:
* **Soco / Chute Básico (`ArrowLeft`):** 
  * **Com Munição:** Consome 1 bola de futebol (`balls--`) e lança o projétil `ball` (⚽) em trajetória rápida.
  * **Sem Munição:** Executa um chute básico de baixo dano.
* **Especial - Recarga Completa (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Craque recupera instantaneamente suas 3 bolas de futebol (`balls = 3`), permitindo retomar a sequência de projéteis.

---

### 4. HADES
* **Conceito & Estilo:** Bárbaro tecnológico revestido em liga metálica escura e aura de fogo. Visual agressivo em tons de marrom couro, ferro e chamas laranjas.
* **Inspiração:** Mitologia subterrânea misturada com fantasia sombria (*Doom Slammer* / *God of War*).
* **Estilo de Luta:** *Berserker*. Ganha vantagem no combate corporal direto com ataques flamejantes de alta prioridade.

#### ⚔️ Mecânicas de Combate:
* **Soco Básico (`ArrowLeft`):** Golpe com punho flamejante que incendeia a caixa de colisão momentaneamente.
* **Especial - Onda do Submundo (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Libera uma explosão de concussão a curta distância, causando dano massivo e quebrando a guarda de defesa do adversário.

---

### 5. JACK
* **Conceito & Estilo:** Entidade biomecânica em estilo traje escuro com uma cabeça de abóbora tecnológica brilhante (laranja e amarelo).
* **Inspiração:** Estética *Cyber-Halloween* e personagens estilo Jack O'Lantern de jogos arcade.
* **Estilo de Luta:** *Trickster / Trapper*. Combina mobilidade imprevisível com arremesso de projéteis de área.

#### ⚔️ Mecânicas de Combate:
* **Soco Básico (`ArrowLeft`):** Corte frontal rápido.
* **Especial - Abóbora Explosiva (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Lança o projétil `pumpkin` (🎃) em arco para frente. Causa dano de impacto e atordoa o oponente por alguns quadros.

---

### 6. KAZE
* **Conceito & Estilo:** Cyborg Ninja minimalista com armadura escura e lâminas com iluminação em tom verde água / turquesa (`#7fffd4`).
* **Inspiração:** Ninjas cibernéticos clássicos da cultura pop (*Overwatch* / *Metal Gear Solid*).
* **Estilo de Luta:** *Rushdown*. Alta velocidade de deslocamento e golpes sequenciais rápidos.

#### ⚔️ Mecânicas de Combate:
* **Soco / Corte Básico (`ArrowLeft`):** Estocada ultra-rápida de katana com baixo *cooldown*.
* **Especial - Lâmina de Vento / Tornado (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Dispara um projétil em forma de tornado (`tornado` 🌪️) que empurra e arremessa o inimigo para o ar.

---

### 7. KENJI
* **Conceito & Estilo:** Artista marcial tradicional cibernetizado usando gi branco, faixa escura e luvas de combate.
* **Inspiração:** Lutadores tradicionais de artes marciais de jogos de luta 2D (*Street Fighter*).
* **Estilo de Luta:** *Combo Master*. Focado no encadeamento contínuo de golpes.

#### ⚔️ Mecânicas de Combate:
* **Mecânica Passiva - Combo Stacking:**
  * Cada acerto bem-sucedido incrementa o contador `comboCounter`.
  * **Efeito:** Reduz o *cooldown* dos seus socos básicos (de 25 quadros até o limite de 8 quadros), permitindo sequências de golpes cada vez mais rápidas.
* **Soco Básico (`ArrowLeft`):** Sequência de golpes diretos acelerados pelo *comboCounter*.
* **Especial - Super Golpe Acumulado (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Executa um golpe pesado proporcional ao valor atual de `comboCounter`.

---

### 8. AKANE
* **Conceito & Estilo:** Guerreira cibernética elegante com armadura dourada/latão (`#c9a46a`) e capa vermelha fluida (`#a13a3a`).
* **Estilo de Luta:** *Life-Steal Slasher*. Recompensa o jogador com sustentação de vida ao manter uma postura agressiva.

#### ⚔️ Mecânicas de Combate:
* **Mecânica Passiva - Drenagem de Vida (On-Hit):**
  * **Efeito:** Toda vez que Akane conecta um ataque (soco ou especial) no adversário, ela recupera **+15 de HP** instantaneamente (`hp = Math.min(maxHp, hp + 15)`).
* **Soco Básico (`ArrowLeft`):** Sequência de estocadas rápidas.
* **Especial - Dança das Lâminas (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Efeito:** Avança com múltiplos acertos contínuos, multiplicando o ganho de vida pela quantidade de hits conectados.

---

### 9. FENRIS
* **Conceito & Estilo:** Lorde de armadura negra pontiaguda com efeitos visuais e lâminas nas cores de energia vermelha sangue (`#f00`).
* **Estilo de Luta:** *Heavy Anti-Tank*. Especialize-se em destruir lutadores com muita vida através da degradação de vida máxima.

#### ⚔️ Mecânicas de Combate:
* **Especial - Morte Destinada (Destined Death) (`ArrowRight`):**
  * **Custo:** 150 Energia
  * **Cooldown:** 80 quadros (Ataque pesado com preparação longa).
  * **Efeito Único:** Ao acertar o oponente com este especial, **reduz permanentemente em 50 pontos o HP Máximo do adversário** (`defender.maxHp -= 50`). O dano causado por este golpe impede que o oponente se cure totalmente até o fim da partida.