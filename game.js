/* FZC v2 - top-down prototype
   Place player.png, bot.png, pet.png in same folder for sprites.
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const joystickCanvas = document.getElementById('joystick');
const jctx = joystickCanvas.getContext('2d');
const shootBtn = document.getElementById('shoot-btn');
const startBtn = document.getElementById('start-btn');
const nameInput = document.getElementById('player-name');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - (window.innerWidth > 900 ? 90 : 140);
}
resize();
window.addEventListener('resize', resize);

/* -------- Resources (sprites) -------- */
const playerImg = new Image();
playerImg.src = 'player.png'; // 40x40 recommended

const botImg = new Image();
botImg.src = 'bot.png'; // 40x40 recommended

const petImg = new Image();
petImg.src = 'pet.png'; // 28x28 recommended

/* -------- Game state -------- */
let gameRunning = false;
const settings = {
  maxPlayers: 15,
  botCount: 14,
  mapW: 2000,
  mapH: 1200,
  bulletSpeed: 600, // px/s
  playerSpeed: 220,
  botSpeedMin: 60,
  botSpeedMax: 120,
  tickScale: 1
};

let viewport = { x:0,y:0,w:canvas.width,h:canvas.height };

class Entity {
  constructor(x,y,r,color) {
    this.x=x; this.y=y; this.r=r; this.color=color; this.hp=100;
    this.vx=0; this.vy=0; this.lastShot=0;
  }
  drawSprite(img, cam, w, h){
    if(!img.complete){ // fallback circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x-cam.x, this.y-cam.y, this.r, 0, Math.PI*2);
      ctx.fill();
      return;
    }
    ctx.drawImage(img, this.x-cam.x - w/2, this.y-cam.y - h/2, w, h);
  }
}

let player = new Entity(settings.mapW/2, settings.mapH/2, 18, '#ffd39b');
player.team = 'player';
player.hp = 100;

let pet = { x: player.x+40, y: player.y+20, r:12 };

let bots = [];
let bullets = [];

/* -------- Spawn bots -------- */
function spawnBots(count){
  bots = [];
  for(let i=0;i<count;i++){
    const b = new Entity(rand(100, settings.mapW-100), rand(100, settings.mapH-100), 16, '#c94c4c');
    b.speed = rand(settings.botSpeedMin, settings.botSpeedMax);
    b.hp = 60 + Math.floor(rand(0,40));
    b.vx = rand(-1,1); b.vy = rand(-1,1);
    b.nextChange = Date.now() + rand(800,2000);
    b.team = 'bot';
    bots.push(b);
  }
}

/* -------- helpers -------- */
function rand(min,max){return Math.random()*(max-min)+min}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

/* -------- bullets -------- */
function spawnBullet(x,y,angle,owner){
  bullets.push({
    x,y,
    vx: Math.cos(angle)*settings.bulletSpeed,
    vy: Math.sin(angle)*settings.bulletSpeed,
    r:4,
    owner
  });
}

/* -------- Bot AI: move and shoot toward player -------- */
function updateBots(dt){
  for(let b of bots){
    if(b.hp <= 0) continue;
    // wander and occasional chase
    if(Date.now() > b.nextChange){
      if(Math.random() < 0.5){
        let ang = Math.atan2(player.y - b.y, player.x - b.x);
        b.vx = Math.cos(ang)*b.speed;
        b.vy = Math.sin(ang)*b.speed;
      } else {
        let ang = Math.random()*Math.PI*2;
        b.vx = Math.cos(ang)*b.speed*0.5;
        b.vy = Math.sin(ang)*b.speed*0.5;
      }
      b.nextChange = Date.now() + rand(600,2200);
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // bounds
    b.x = clamp(b.x, 20, settings.mapW-20);
    b.y = clamp(b.y, 20, settings.mapH-20);

    // If close, shoot
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if(d < 380 && Date.now() - b.lastShot > 700){
      let ang = Math.atan2(player.y - b.y, player.x - b.x);
      spawnBullet(b.x, b.y, ang, b);
      b.lastShot = Date.now();
    }
  }
}

/* -------- Bullets update & collision -------- */
function updateBullets(dt){
  for(let i = bullets.length-1; i>=0; i--){
    const bl = bullets[i];
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    // bounds removal
    if(bl.x < 0 || bl.x > settings.mapW || bl.y < 0 || bl.y > settings.mapH){
      bullets.splice(i,1); continue;
    }
    // owner bot bullet hits player
    if(bl.owner && bl.owner.team === 'bot'){
      if(Math.hypot(player.x - bl.x, player.y - bl.y) < player.r + bl.r){
        player.hp -= 12;
        bullets.splice(i,1);
        continue;
      }
    } else {
      // player bullets hit bots
      for(let j = 0; j < bots.length; j++){
        let bo = bots[j];
        if(bo.hp > 0 && Math.hypot(bo.x - bl.x, bo.y - bl.y) < bo.r + bl.r){
          bo.hp -= 40;
          bullets.splice(i,1);
          break;
        }
      }
    }
  }
  // remove dead bots
  for(let i=bots.length-1;i>=0;i--){
    if(bots[i].hp <= 0) bots.splice(i,1);
  }
}

/* -------- Draw world (background, grid optional) -------- */
function drawBackground(cam){
  // simple animated background gradient (you can replace with image later)
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#110606');
  g.addColorStop(1,'#0b0b0b');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // subtle map grid to show movement
  const tile = 100;
  ctx.strokeStyle = 'rgba(20,20,20,0.6)';
  ctx.lineWidth = 1;
  for(let x = - (cam.x % tile); x < canvas.width; x += tile){
    for(let y = - (cam.y % tile); y < canvas.height; y += tile){
      ctx.strokeRect(x, y, tile, tile);
    }
  }
}

/* -------- Draw everything -------- */
function drawAll(cam){
  // background
  drawBackground(cam);
  // bots
  for(let b of bots) b.drawSprite(botImg, cam, 40, 40);
  // player
  player.drawSprite(playerImg, cam, 46, 46);
  // pet (follow player)
  pet.x = player.x + 40; pet.y = player.y + 22;
  if(petImg.complete) ctx.drawImage(petImg, pet.x - cam.x - 16, pet.y - cam.y - 16, 32, 32);
  // bullets
  for(let bl of bullets){
    ctx.beginPath();
    ctx.fillStyle = bl.owner && bl.owner.team === 'bot' ? '#ff7070' : '#ffd39b';
    ctx.arc(bl.x - cam.x, bl.y - cam.y, bl.r, 0, Math.PI*2);
    ctx.fill();
  }
  // HUD
  ctx.fillStyle = '#000';
  ctx.fillRect(16,16,220,18);
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(16,16,220*(player.hp/100),18);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.strokeRect(16,16,220,18);
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.fillText('HP', 10, 30);
  ctx.fillText('Enemies: '+bots.length, canvas.width - 120, 30);
}

/* -------- Joystick (simple delta-based) -------- */
let joystick = { active:false, sx:0, sy:0, dx:0, dy:0 };
joystickCanvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  const t = e.touches[0];
  joystick.active = true;
  joystick.sx = t.clientX;
  joystick.sy = t.clientY;
});
joystickCanvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(!joystick.active) return;
  const t = e.touches[0];
  joystick.dx = t.clientX - joystick.sx;
  joystick.dy = t.clientY - joystick.sy;
});
joystickCanvas.addEventListener('touchend', e=>{
  e.preventDefault();
  joystick.active = false;
  joystick.dx = 0; joystick.dy = 0;
});

function drawJoystickUI(){
  jctx.clearRect(0,0,joystickCanvas.width, joystickCanvas.height);
  // base
  jctx.fillStyle = 'rgba(255,255,255,0.02)';
  jctx.fillRect(0,0,joystickCanvas.width, joystickCanvas.height);
  // knob
  const kx = joystickCanvas.width/2 + joystick.dx/6;
  const ky = joystickCanvas.height/2 + joystick.dy/6;
  jctx.beginPath();
  jctx.fillStyle = 'rgba(184,134,11,0.9)';
  jctx.arc(kx, ky, 28, 0, Math.PI*2);
  jctx.fill();
}

/* -------- Player shoot control (touch) -------- */
let lastPlayerShot = 0;
shootBtn.addEventListener('touchstart', e=>{
  e.preventDefault();
  // shoot at closest bot or forward if none
  if(!gameRunning) return;
  if(bots.length === 0) return;
  const now = Date.now();
  if(now - lastPlayerShot < 240) return; // cooldown
  lastPlayerShot = now;
  // choose nearest target
  let minD = Infinity, target = null;
  for(let b of bots){
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if(d < minD){ minD = d; target = b; }
  }
  let ang = 0;
  if(target) ang = Math.atan2(target.y - player.y, target.x - player.x);
  spawnBullet(player.x, player.y, ang, player);
});

/* -------- Game loop -------- */
let last = performance.now();
function loop(now){
  const dt = (now - last)/1000;
  last = now;
  if(gameRunning){
    // move player from joystick
    if(joystick.active){
      const speed = settings.playerSpeed * dt;
      // dx,dy are in pixels moved; scale down to not be too fast
      player.x += joystick.dx * 0.14;
      player.y += joystick.dy * 0.14;
    }
    // clamp player on map
    player.x = clamp(player.x, 20, settings.mapW-20);
    player.y = clamp(player.y, 20, settings.mapH-20);

    // update bots and bullets
    updateBots(dt);
    updateBullets(dt);

    // update viewport
    viewport.w = canvas.width; viewport.h = canvas.height;
    viewport.x = player.x - viewport.w/2;
    viewport.y = player.y - viewport.h/2;
    viewport.x = clamp(viewport.x, 0, settings.mapW - viewport.w);
    viewport.y = clamp(viewport.y, 0, settings.mapH - viewport.h);

    // draw
    drawAll(viewport);
    drawJoystickUI();

    // win/lose
    if(player.hp <= 0){ gameRunning = false; setTimeout(()=>alert('You were defeated. Refresh to play again.'),50); }
    if(bots.length === 0 && gameRunning){ gameRunning = false; setTimeout(()=>alert('You win! All enemies down.'),50); }
  } else {
    // when not running, still draw background so player sees something
    drawBackground(viewport);
    drawJoystickUI();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* -------- Start button -------- */
startBtn.addEventListener('click', ()=>{
  const name = nameInput.value.trim();
  if(name.length === 0){ alert('Enter your name'); return; }
  player.name = name;
  // reset
  player.x = settings.mapW/2; player.y = settings.mapH/2; player.hp = 100;
  spawnBots(settings.botCount);
  bullets = [];
  gameRunning = true;
  document.getElementById('login-screen').style.display = 'none';
});

/* -------- Utility: quick random range int -------- */
function randInt(min,max){ return Math.floor(rand(min,max+1)); }
